import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { admin, connect } from "../../scripts/db/local.mts";
import { pool } from "../db/index.ts";
import { addTask, allocate, availability, cancelBooking, checkIn, createEstimate, createRequest, decideEstimate, issueEstimate, previewDecision, recordAbsence, updateWork, workspace, type Actor } from "./service.ts";
import { WorkflowError } from "./rules.ts";

const workshopId = process.env.BAYFRAME_WORKSHOP_ID!;
const otherWorkshopId = randomUUID();
const authIds = Array.from({ length: 5 }, () => randomUUID());
const staffIds = Array.from({ length: 5 }, () => randomUUID());
const [managerId, adviserId, technicianId, otherTechnicianId, otherManagerId] = staffIds;
const [bayId, secondBayId, technicianResourceId, secondTechnicianResourceId, otherBayId] = Array.from({ length: 5 }, () => randomUUID());
const manager: Actor = { id: managerId, workshopId, authUserId: authIds[0], role: "manager" };
const adviser: Actor = { id: adviserId, workshopId, authUserId: authIds[1], role: "adviser" };
const technician: Actor = { id: technicianId, workshopId, authUserId: authIds[2], role: "technician" };
const otherTechnician: Actor = { id: otherTechnicianId, workshopId, authUserId: authIds[3], role: "technician" };
const foreignManager: Actor = { id: otherManagerId, workshopId: otherWorkshopId, authUserId: authIds[4], role: "manager" };
let raw: Awaited<ReturnType<typeof connect>>;
let migrator: Awaited<ReturnType<typeof connect>>;

const slot = (hour: number, day = 7) => new Date(`2031-04-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00+01:00`);
const request = (hour: number, day = 7) => createRequest({ workshopId, name: "Fixture Customer", email: "fixture@example.test", registration: `T${day}${hour}`, startAt: slot(hour, day).toISOString() });
async function waitForLocks(expected: number) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const count = Number(admin("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND usename='bayframe_runtime' AND state='active' AND wait_event_type='Lock'", process.env.BAYFRAME_DATABASE));
    if (count >= expected) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Expected ${expected} independent transactions waiting for locks`);
}
async function queuedWorkRace(workId: string, first: () => Promise<unknown>, second: () => Promise<unknown>) {
  await raw.query("BEGIN");
  await raw.query("SELECT id FROM app.work_orders WHERE id=$1 FOR UPDATE", [workId]);
  const pending: Promise<PromiseSettledResult<unknown>>[] = [];
  const start = (operation: () => Promise<unknown>) => pending.push(operation().then(
    (value) => ({ status: "fulfilled" as const, value }),
    (reason: unknown) => ({ status: "rejected" as const, reason }),
  ));
  try {
    start(first);
    await waitForLocks(1);
    start(second);
    await waitForLocks(2);
  } finally {
    await raw.query("ROLLBACK");
    await Promise.all(pending);
  }
  return Promise.all(pending);
}
async function plannedWork(hour: number, day: number) {
  const bookingId = await request(hour, day);
  await allocate(manager, { bookingId, bayId, technicianId: technicianResourceId });
  const workId = await checkIn(manager, bookingId);
  await addTask(manager, workId, "Synthetic approved scope");
  return workId;
}
beforeAll(async () => {
  admin(`INSERT INTO auth.users (id) VALUES ${authIds.map((id) => `('${id}')`).join(",")};`, process.env.BAYFRAME_DATABASE);
  migrator = await connect("bayframe_migrator", process.env.BAYFRAME_DATABASE);
  await migrator.query("INSERT INTO app.workshops(id,name,timezone) VALUES ($1,'Fixture Workshop','Europe/London'),($2,'Other Workshop','Europe/London')", [workshopId, otherWorkshopId]);
  await migrator.query("INSERT INTO app.staff(id,workshop_id,auth_user_id,role) VALUES ($1,$2,$3,'manager'),($4,$2,$5,'adviser'),($6,$2,$7,'technician'),($8,$2,$9,'technician'),($10,$11,$12,'manager')", [managerId, workshopId, authIds[0], adviserId, authIds[1], technicianId, authIds[2], otherTechnicianId, authIds[3], otherManagerId, otherWorkshopId, authIds[4]]);
  await migrator.query("INSERT INTO app.resources(id,workshop_id,type,name,staff_id) VALUES ($1,$2,'bay','Bay A',NULL),($3,$2,'bay','Bay B',NULL),($4,$2,'technician','Tech A',$5),($6,$2,'technician','Tech B',$7),($8,$9,'bay','Other Bay',NULL)", [bayId, workshopId, secondBayId, technicianResourceId, technicianId, secondTechnicianResourceId, otherTechnicianId, otherBayId, otherWorkshopId]);
  raw = await connect("bayframe_runtime", process.env.BAYFRAME_DATABASE);
});

afterAll(async () => {
  await raw?.end();
  await migrator?.end();
  await pool.end();
});

describe("workflow against local PostgreSQL", () => {
  it("logs a lost idle connection safely and serves the next pool query", async () => {
    const database = process.env.BAYFRAME_DATABASE!;
    expect(/^bf_verify_[a-f0-9]{16}$/.test(database)).toBe(true);
    const client = await pool.connect();
    let pid: number;
    try {
      const identity = (await client.query("SELECT pg_backend_pid() AS pid,current_database() AS database")).rows[0];
      expect(identity.database).toBe(database);
      pid = identity.pid;
      expect(Number.isInteger(pid) && pid > 0).toBe(true);
    } finally {
      client.release();
    }
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let observe: (() => void) | undefined;
    try {
      const lost = new Promise<void>((resolve, reject) => {
        observe = resolve;
        pool.once("error", observe);
        timeout = setTimeout(() => reject(new Error("Idle pool error was not observed")), 3000);
      });
      expect(admin(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid=${pid} AND datname=current_database() AND usename='bayframe_runtime' AND state='idle'`, database)).toBe("t");
      await lost;
      expect(log).toHaveBeenCalledTimes(1);
      const record = JSON.parse(log.mock.calls[0][0] as string);
      expect(Object.keys(record).sort()).toEqual(["correlationId", "errorClass", "operation", "outcome"]);
      expect(record).toMatchObject({ operation: "database-pool", outcome: "failed", errorClass: "database-connection", correlationId: expect.any(String) });
      expect((await pool.query("SELECT 1 AS value")).rows[0].value).toBe(1);
    } finally {
      clearTimeout(timeout);
      if (observe) pool.off("error", observe);
      log.mockRestore();
    }
  });

  it("projects permitted work actions through start, rejection, revision and current approval", async () => {
    const bookingId = await request(10, 21);
    await allocate(manager, { bookingId, bayId, technicianId: technicianResourceId });
    const workId = await checkIn(manager, bookingId);
    const projectedWork = async (actor = manager) => (await workspace(actor)).workOrders.find((work) => work.id === workId);
    const unapproved = { approvalAccepted: false, canAddTask: true, canMarkTaskComplete: false, canComplete: false };
    expect(await projectedWork()).toMatchObject({ state: "ready", ...unapproved });
    await addTask(manager, workId, "Initial diagnostic task");
    const taskId = (await raw.query("SELECT id FROM app.tasks WHERE work_order_id=$1", [workId])).rows[0].id as string;
    await updateWork(technician, workId, "start");
    expect(await projectedWork()).toMatchObject({ state: "in-progress", ...unapproved });
    await expect(updateWork(technician, workId, "task", taskId)).rejects.toThrow(WorkflowError);
    await expect(updateWork(technician, workId, "complete")).rejects.toThrow(WorkflowError);

    const first = await createEstimate(manager, workId, [{ description: "Initial service", quantity: 1, unitPrice: 100 }]);
    const rejectedToken = await issueEstimate(manager, first);
    expect(await decideEstimate(rejectedToken, "rejected")).toBe("recorded");
    expect(await projectedWork()).toMatchObject({ state: "in-progress", ...unapproved });
    await expect(updateWork(technician, workId, "task", taskId)).rejects.toThrow(WorkflowError);
    await expect(updateWork(technician, workId, "complete")).rejects.toThrow(WorkflowError);

    const revised = await createEstimate(adviser, workId, [{ description: "Revised service", quantity: 1, unitPrice: 200 }]);
    expect(await projectedWork()).toMatchObject(unapproved);
    await expect(decideEstimate(rejectedToken, "rejected")).rejects.toThrow(WorkflowError);
    const acceptedToken = await issueEstimate(adviser, revised);
    expect(await decideEstimate(acceptedToken, "accepted")).toBe("recorded");
    const approved = { approvalAccepted: true, canAddTask: false, canMarkTaskComplete: true, canComplete: false };
    expect(await projectedWork()).toMatchObject(approved);
    await expect(addTask(manager, workId, "Unapproved extra work")).rejects.toThrow(WorkflowError);

    const technicianView = await workspace(technician);
    expect(technicianView.workOrders.find((work) => work.id === workId)).toMatchObject({ ...approved, canAddTask: false });
    expect(technicianView.estimates).toEqual([]);
    expect(technicianView.lines).toEqual([]);
    expect(technicianView.bookings).toEqual([]);
    expect(technicianView.resources).toEqual([]);
    expect(technicianView.audit).toEqual([]);
    await updateWork(technician, workId, "task", taskId);
    expect(await projectedWork(technician)).toMatchObject({ approvalAccepted: true, canAddTask: false, canMarkTaskComplete: false, canComplete: true });

    await createEstimate(manager, workId, [{ description: "Additional scope", quantity: 1, unitPrice: 300 }]);
    expect(await projectedWork()).toMatchObject(unapproved);
    expect(await projectedWork(technician)).toMatchObject({ ...unapproved, canAddTask: false });
    await expect(updateWork(technician, workId, "complete")).rejects.toThrow(WorkflowError);
    await addTask(manager, workId, "New draft planning task");
  });

  it("allows task planning when a new draft replaces a pending issued estimate", async () => {
    const bookingId = await request(10, 23);
    await allocate(manager, { bookingId, bayId, technicianId: technicianResourceId });
    const workId = await checkIn(manager, bookingId);
    await addTask(manager, workId, "Original pending scope");
    const first = await createEstimate(manager, workId, [{ description: "Original scope", quantity: 1, unitPrice: 100 }]);
    const oldToken = await issueEstimate(manager, first);
    await createEstimate(manager, workId, [{ description: "Replacement scope", quantity: 1, unitPrice: 200 }]);
    await expect(previewDecision(oldToken)).rejects.toThrow(WorkflowError);
    await addTask(manager, workId, "Task required by replacement draft");
    const view = await workspace(manager);
    expect(view.workOrders.find((work) => work.id === workId)).toMatchObject({
      state: "awaiting-approval", approvalAccepted: false, canAddTask: true, canMarkTaskComplete: false, canComplete: false,
    });
    const taskId = view.tasks.find((task) => task.workOrderId === workId)!.id;
    await expect(updateWork(technician, workId, "task", taskId)).rejects.toThrow(WorkflowError);
    await expect(updateWork(technician, workId, "complete")).rejects.toThrow(WorkflowError);
  });

  it("reports advisory capacity without reservations and reflects allocations, absences and release", async () => {
    const startAt = slot(10, 22), endAt = slot(11, 22);
    await expect(availability(workshopId, startAt.toISOString())).resolves.toEqual({ bays: 2, technicians: 2 });
    const bookingId = await request(10, 22);
    await expect(availability(workshopId, startAt.toISOString())).resolves.toEqual({ bays: 2, technicians: 2 });
    expect((await raw.query("SELECT count(*)::int AS n FROM app.allocations WHERE booking_id=$1", [bookingId])).rows[0].n).toBe(0);
    await allocate(manager, { bookingId, bayId, technicianId: technicianResourceId });
    await expect(availability(workshopId, startAt.toISOString())).resolves.toEqual({ bays: 1, technicians: 1 });
    await expect(recordAbsence(manager, bayId, startAt, endAt)).rejects.toThrow(WorkflowError);
    expect((await raw.query("SELECT count(*)::int AS n FROM app.absences WHERE resource_id=$1", [bayId])).rows[0].n).toBe(0);
    expect((await raw.query("SELECT count(*)::int AS n FROM app.audit_events WHERE resource_id=$1 AND action='absence-recorded'", [bayId])).rows[0].n).toBe(0);
    await recordAbsence(manager, secondBayId, startAt, endAt);
    await recordAbsence(manager, secondTechnicianResourceId, startAt, endAt);
    await expect(availability(workshopId, startAt.toISOString())).resolves.toEqual({ bays: 0, technicians: 0 });
    await expect(availability(workshopId, endAt.toISOString())).resolves.toEqual({ bays: 2, technicians: 2 });
    await cancelBooking(manager, bookingId);
    await expect(availability(workshopId, startAt.toISOString())).resolves.toEqual({ bays: 1, technicians: 1 });
    await recordAbsence(manager, bayId, slot(14, 22), slot(15, 22));
    expect((await raw.query("SELECT count(*)::int AS n FROM app.absences WHERE resource_id=$1", [bayId])).rows[0].n).toBe(1);
    expect((await raw.query("SELECT count(*)::int AS n FROM app.audit_events WHERE resource_id=$1 AND action='absence-recorded'", [bayId])).rows[0].n).toBe(1);
    await expect(availability(otherWorkshopId, startAt.toISOString())).rejects.toThrow(WorkflowError);
  });

  it("retains task attribution and record references in manager audit history", async () => {
    const bookingId = await request(10, 24);
    await allocate(manager, { bookingId, bayId, technicianId: technicianResourceId });
    const workId = await checkIn(manager, bookingId);
    await addTask(manager, workId, "Auditable task");
    const taskId = (await raw.query("SELECT id FROM app.tasks WHERE work_order_id=$1", [workId])).rows[0].id as string;
    const estimateId = await createEstimate(manager, workId, [{ description: "Auditable scope", quantity: 1, unitPrice: 100 }]);
    const token = await issueEstimate(manager, estimateId);
    await decideEstimate(token, "accepted");
    await updateWork(technician, workId, "task", taskId);
    const taskEvents = (await raw.query("SELECT action,actor_id,created_at,details FROM app.audit_events WHERE work_order_id=$1 AND action IN ('task-added','task-completed') ORDER BY action", [workId])).rows;
    expect(taskEvents).toHaveLength(2);
    expect(taskEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "task-added", actor_id: manager.id, created_at: expect.any(Date), details: { taskId } }),
      expect.objectContaining({ action: "task-completed", actor_id: technician.id, created_at: expect.any(Date), details: { taskId } }),
    ]));
    await recordAbsence(manager, secondBayId, slot(12, 24), slot(13, 24));
    const view = await workspace(manager);
    expect(view.audit).toEqual(expect.arrayContaining([
      expect.objectContaining({ bookingId, action: "confirmed" }),
      expect.objectContaining({ workOrderId: workId, action: "task-completed", details: { taskId } }),
      expect.objectContaining({ estimateId, workOrderId: workId, action: "customer-accepted" }),
      expect.objectContaining({ resourceId: secondBayId, action: "absence-recorded" }),
    ]));
    expect(Object.keys(view.audit[0])).toEqual(expect.arrayContaining(["bookingId", "workOrderId", "estimateId", "resourceId", "details"]));
    expect((await workspace(adviser)).audit).toEqual([]);
    expect((await workspace(technician)).audit).toEqual([]);
  });

  it("accepts valid London DST offsets and rejects malformed, weekend, and out-of-hours requests", async () => {
    const id = await createRequest({ workshopId, name: "  Customer  ", email: "fixture@example.test", registration: " ab12 ", startAt: slot(9).toISOString() });
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(createRequest({ workshopId, name: "Customer", email: "fixture@example.test", registration: "A", startAt: "2031-04-12T09:00:00+01:00" })).rejects.toThrow(WorkflowError);
    await expect(createRequest({ workshopId, name: "Customer", email: "fixture@example.test", registration: "A", startAt: "2031-04-07T08:00:00+01:00" })).rejects.toThrow(WorkflowError);
    await expect(createRequest({ workshopId: otherWorkshopId, name: "Customer", email: "fixture@example.test", registration: "A", startAt: slot(10).toISOString() })).rejects.toThrow(WorkflowError);
    expect((await raw.query("SELECT app.valid_slot($1::uuid,$2::timestamptz,$3::timestamptz) AS ok", [workshopId, "2031-10-27T09:00:00+00:00", "2031-10-27T10:00:00+00:00"])).rows[0].ok).toBe(true);
  });

  it("completes request, allocation, check-in, issued estimate, customer approval, tasks, and close audit", async () => {
    const bookingId = await request(10);
    await allocate(adviser, { bookingId, bayId, technicianId: technicianResourceId });
    const workId = await checkIn(manager, bookingId);
    await addTask(manager, workId, "Replace component");
    const taskId = (await raw.query("SELECT id FROM app.tasks WHERE work_order_id=$1", [workId])).rows[0].id as string;
    const estimateId = await createEstimate(adviser, workId, [{ description: "Part", quantity: 2, unitPrice: 101 }]);
    const token = await issueEstimate(manager, estimateId);
    expect((await previewDecision(token)).tax).toBe(40);
    expect(await decideEstimate(token, "accepted")).toBe("recorded");
    expect(await decideEstimate(token, "accepted")).toBe("already-recorded");
    await expect(decideEstimate(token, "rejected")).rejects.toThrow(WorkflowError);
    await updateWork(technician, workId, "task", taskId);
    await updateWork(technician, workId, "complete");
    await updateWork(manager, workId, "close");
    const result = await raw.query(`SELECT w.state, b.state AS booking_state,
      (SELECT count(*) FROM app.allocations a WHERE a.booking_id=b.id AND a.released_at IS NULL)::int AS active,
      (SELECT count(*) FROM app.allocations a WHERE a.booking_id=b.id AND a.released_at IS NOT NULL)::int AS history
      FROM app.work_orders w JOIN app.bookings b ON b.id=w.booking_id WHERE w.id=$1`, [workId]);
    expect(result.rows[0]).toMatchObject({ state: "closed", booking_state: "checked-in", active: 0, history: 2 });
    expect((await raw.query("SELECT array_agg(action ORDER BY action) AS actions FROM app.audit_events WHERE booking_id=$1 OR work_order_id=$2 OR estimate_id=$3", [bookingId, workId, estimateId])).rows[0].actions).toEqual(expect.arrayContaining(["requested", "confirmed", "checked-in", "estimate-issued", "customer-accepted", "task-completed", "complete", "close"]));
  });

  it("enforces estimate snapshot immutability, resource exclusion, scope, and interval constraints in SQL", async () => {
    const bookingId = await request(11);
    await allocate(manager, { bookingId, bayId, technicianId: technicianResourceId });
    const workId = await checkIn(manager, bookingId);
    await addTask(manager, workId, "Inspect");
    const estimateId = await createEstimate(manager, workId, [{ description: "Labour", quantity: 1, unitPrice: 500 }]);
    const token = await issueEstimate(manager, estimateId);
    const lineId = (await raw.query("SELECT id FROM app.estimate_lines WHERE estimate_id=$1", [estimateId])).rows[0].id;
    await expect(migrator.query("UPDATE app.estimate_lines SET unit_price=999 WHERE id=$1", [lineId])).rejects.toMatchObject({ code: "23514" });
    await expect(migrator.query("UPDATE app.estimates SET total=1 WHERE id=$1", [estimateId])).rejects.toMatchObject({ code: "23514" });
    for (const change of ["token_hash=repeat('e',64)", "expires_at=expires_at+interval '1 hour'", "version=version+1", "work_order_id=gen_random_uuid()"]) {
      await expect(migrator.query(`UPDATE app.estimates SET ${change} WHERE id=$1`, [estimateId])).rejects.toMatchObject({ code: "23514" });
    }
    await expect(migrator.query("UPDATE app.estimate_lines SET estimate_id=gen_random_uuid() WHERE id=$1", [lineId])).rejects.toMatchObject({ code: "23514" });
    await expect(migrator.query("DELETE FROM app.estimate_lines WHERE id=$1", [lineId])).rejects.toMatchObject({ code: "23514" });
    await expect(raw.query("UPDATE app.staff SET id=$1 WHERE id=$2", [randomUUID(), managerId])).rejects.toMatchObject({ code: "23514" });
    expect((await previewDecision(token)).total).toBe(600);

    const inconsistent = randomUUID();
    await migrator.query("INSERT INTO app.estimates(id,workshop_id,work_order_id,version,state,net,tax,total) VALUES ($1,$2,$3,2,'draft',200,40,240)", [inconsistent, workshopId, workId]);
    await migrator.query("INSERT INTO app.estimate_lines(workshop_id,estimate_id,description,quantity,unit_price) VALUES ($1,$2,'Mismatch',1,100)", [workshopId, inconsistent]);
    await expect(migrator.query("UPDATE app.estimates SET state='issued',token_hash=$1,issued_at=$2,expires_at=$3 WHERE id=$4", ["b".repeat(64), slot(11), slot(12), inconsistent])).rejects.toMatchObject({ code: "23514" });
    await expect(migrator.query(`INSERT INTO app.estimates(workshop_id,work_order_id,version,state,net,tax,total,token_hash,issued_at,expires_at)
      VALUES ($1,$2,3,'issued',100,20,120,$3,$4,$5)`, [workshopId, workId, "c".repeat(64), slot(11), slot(12)])).rejects.toMatchObject({ code: "23514" });

    const secondBooking = await request(11);
    await expect(migrator.query(`INSERT INTO app.allocations(workshop_id,booking_id,resource_id,kind,start_at,end_at)
      VALUES ($1,$2,$3,'bay',$4,$5)`, [workshopId, secondBooking, bayId, slot(11), new Date(slot(11).getTime() + 3600000)])).rejects.toMatchObject({ code: "23P01" });
    await expect(migrator.query(`INSERT INTO app.allocations(workshop_id,booking_id,resource_id,kind,start_at,end_at)
      VALUES ($1,$2,$3,'bay',$4,$5)`, [workshopId, secondBooking, otherBayId, slot(11), new Date(slot(11).getTime() + 3600000)])).rejects.toMatchObject({ code: "23503" });
    await expect(migrator.query(`INSERT INTO app.allocations(workshop_id,booking_id,resource_id,kind,start_at,end_at)
      VALUES ($1,$2,$3,'bay','infinity','infinity')`, [workshopId, secondBooking, secondBayId])).rejects.toMatchObject({ code: "23514" });
    await recordAbsence(manager, secondBayId, slot(11), new Date(slot(11).getTime() + 3600000));
    await expect(migrator.query(`INSERT INTO app.allocations(workshop_id,booking_id,resource_id,kind,start_at,end_at)
      VALUES ($1,$2,$3,'bay',$4,$5)`, [workshopId, secondBooking, secondBayId, slot(11), new Date(slot(11).getTime() + 3600000)])).rejects.toMatchObject({ code: "23514" });

    const partial = await request(12);
    await migrator.query("BEGIN");
    await migrator.query(`INSERT INTO app.allocations(workshop_id,booking_id,resource_id,kind,start_at,end_at)
      VALUES ($1,$2,$3,'bay',$4,$5)`, [workshopId, partial, secondBayId, slot(12), new Date(slot(12).getTime() + 3600000)]);
    await migrator.query("UPDATE app.bookings SET state='confirmed' WHERE id=$1", [partial]);
    await expect(migrator.query("COMMIT")).rejects.toMatchObject({ code: "23514" });
    await migrator.query("ROLLBACK");
  });

  it("serializes duplicate allocation, rolls a failed reschedule back, and preserves released cancellation rows", async () => {
    const same = await request(13);
    const concurrent = await Promise.allSettled([
      allocate(manager, { bookingId: same, bayId, technicianId: technicianResourceId }),
      allocate(manager, { bookingId: same, bayId: secondBayId, technicianId: secondTechnicianResourceId }),
    ]);
    expect(concurrent.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter((r) => r.status === "rejected")).toHaveLength(1);

    const partialFailure = await request(9, 8);
    await migrator.query(`CREATE FUNCTION app.test_fail_second_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='technician' THEN RAISE EXCEPTION 'injected second allocation failure' USING ERRCODE='P0001'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER test_fail_second_allocation BEFORE INSERT ON app.allocations FOR EACH ROW EXECUTE FUNCTION app.test_fail_second_allocation()`);
    try {
      await expect(allocate(manager, { bookingId: partialFailure, bayId, technicianId: technicianResourceId })).rejects.toThrow();
    } finally {
      await migrator.query("DROP TRIGGER test_fail_second_allocation ON app.allocations; DROP FUNCTION app.test_fail_second_allocation()");
    }
    expect((await raw.query("SELECT state FROM app.bookings WHERE id=$1", [partialFailure])).rows[0].state).toBe("requested");
    expect((await raw.query("SELECT count(*)::int AS n FROM app.allocations WHERE booking_id=$1", [partialFailure])).rows[0].n).toBe(0);
    expect((await raw.query("SELECT array_agg(action) AS actions FROM app.audit_events WHERE booking_id=$1", [partialFailure])).rows[0].actions).toEqual(["requested"]);

    const move = await request(14);
    await allocate(manager, { bookingId: move, bayId, technicianId: technicianResourceId });
    await migrator.query(`CREATE FUNCTION app.test_fail_reschedule_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='rescheduled' THEN RAISE EXCEPTION 'injected audit failure' USING ERRCODE='P0001'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER test_fail_reschedule_audit BEFORE INSERT ON app.audit_events FOR EACH ROW EXECUTE FUNCTION app.test_fail_reschedule_audit()`);
    try {
      await expect(allocate(manager, { bookingId: move, bayId: secondBayId, technicianId: secondTechnicianResourceId, startAt: slot(15) })).rejects.toThrow();
    } finally {
      await migrator.query("DROP TRIGGER test_fail_reschedule_audit ON app.audit_events; DROP FUNCTION app.test_fail_reschedule_audit()");
    }
    expect((await raw.query("SELECT state,start_at FROM app.bookings WHERE id=$1", [move])).rows[0]).toMatchObject({ state: "confirmed", start_at: slot(14) });
    expect((await raw.query("SELECT count(*)::int AS n FROM app.allocations WHERE booking_id=$1 AND released_at IS NULL", [move])).rows[0].n).toBe(2);

    const successfulMove = await request(14, 8);
    await allocate(manager, { bookingId: successfulMove, bayId, technicianId: technicianResourceId });
    await allocate(manager, { bookingId: successfulMove, bayId: secondBayId, technicianId: secondTechnicianResourceId, startAt: slot(15, 8) });
    expect((await raw.query("SELECT start_at FROM app.bookings WHERE id=$1", [successfulMove])).rows[0].start_at).toEqual(slot(15, 8));
    expect((await raw.query("SELECT count(*) FILTER (WHERE released_at IS NULL)::int AS active,count(*) FILTER (WHERE released_at IS NOT NULL)::int AS history FROM app.allocations WHERE booking_id=$1", [successfulMove])).rows[0]).toEqual({ active: 2, history: 2 });
    const adjacent = await request(16, 8);
    await allocate(manager, { bookingId: adjacent, bayId: secondBayId, technicianId: secondTechnicianResourceId });
    expect((await raw.query("SELECT count(*)::int AS n FROM app.allocations WHERE resource_id=ANY($1::uuid[]) AND released_at IS NULL AND start_at >= $2 AND end_at <= $3", [[secondBayId, secondTechnicianResourceId], slot(15, 8), slot(17, 8)])).rows[0].n).toBe(4);

    const cancelled = await request(16);
    await allocate(adviser, { bookingId: cancelled, bayId: secondBayId, technicianId: secondTechnicianResourceId });
    await cancelBooking(manager, cancelled);
    expect((await raw.query("SELECT count(*)::int AS n FROM app.allocations WHERE booking_id=$1 AND released_at IS NOT NULL", [cancelled])).rows[0].n).toBe(2);
    await expect(cancelBooking(manager, cancelled)).rejects.toThrow(WorkflowError);
  });

  it("observes a real lock wait and preserves invariants across confirm, cancel, and reschedule races", async () => {
    const bookingId = await request(12, 9);
    await raw.query("BEGIN");
    await raw.query("SELECT id FROM app.resources WHERE id=$1 FOR UPDATE", [bayId]);
    const pending = allocate(manager, { bookingId, bayId, technicianId: technicianResourceId });
    const deadline = Date.now() + 2500;
    let waiting = false;
    try {
      while (Date.now() < deadline) {
        const count = Number(admin(`SELECT count(*) FROM pg_stat_activity WHERE datname='${process.env.BAYFRAME_DATABASE}' AND usename='bayframe_runtime' AND state='active' AND wait_event_type='Lock';`, process.env.BAYFRAME_DATABASE));
        if (count > 0) { waiting = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } finally {
      await raw.query("COMMIT");
    }
    await pending;
    expect(waiting).toBe(true);

    const cancelled = await request(9, 10);
    const cancelRace = await Promise.allSettled([
      allocate(manager, { bookingId: cancelled, bayId, technicianId: technicianResourceId }),
      cancelBooking(manager, cancelled),
    ]);
    expect(cancelRace[1].status).toBe("fulfilled");
    expect((await raw.query("SELECT state FROM app.bookings WHERE id=$1", [cancelled])).rows[0].state).toBe("cancelled");
    expect((await raw.query("SELECT count(*)::int AS n FROM app.allocations WHERE booking_id=$1 AND released_at IS NULL", [cancelled])).rows[0].n).toBe(0);

    const reschedule = await request(10, 10);
    const rescheduleRace = await Promise.allSettled([
      allocate(manager, { bookingId: reschedule, bayId: secondBayId, technicianId: secondTechnicianResourceId }),
      allocate(manager, { bookingId: reschedule, bayId: bayId, technicianId: technicianResourceId, startAt: slot(11, 10) }),
    ]);
    expect(rescheduleRace.some((result) => result.status === "fulfilled")).toBe(true);
    const final = (await raw.query(`SELECT b.state,b.start_at,
      count(a.id) FILTER (WHERE a.released_at IS NULL)::int AS active,
      bool_and(a.start_at=b.start_at AND a.end_at=b.end_at) FILTER (WHERE a.released_at IS NULL) AS aligned
      FROM app.bookings b LEFT JOIN app.allocations a ON a.booking_id=b.id WHERE b.id=$1 GROUP BY b.id`, [reschedule])).rows[0];
    expect(final).toMatchObject({ state: "confirmed", active: 2, aligned: true });
  });

  it.each([true, false])("serializes a valid approval and replacement scope, decision first: %s", async (decisionFirst) => {
    const workId = await plannedWork(decisionFirst ? 9 : 10, 28);
    const original = await createEstimate(manager, workId, [{ description: "Original", quantity: 1, unitPrice: 300 }]);
    const token = await issueEstimate(manager, original);
    let replacement = "";
    const decide = () => decideEstimate(token, "accepted");
    const revise = async () => {
      replacement = await createEstimate(manager, workId, [{ description: "Replacement", quantity: 1, unitPrice: 400 }]);
      await issueEstimate(manager, replacement);
    };
    const results = await queuedWorkRace(workId, decisionFirst ? decide : revise, decisionFirst ? revise : decide);
    expect(results.map((result) => result.status)).toEqual(decisionFirst ? ["fulfilled", "fulfilled"] : ["fulfilled", "rejected"]);
    if (!decisionFirst && results[1].status === "rejected") expect(results[1].reason instanceof WorkflowError).toBe(true);
    const originalRow = (await raw.query("SELECT state,(SELECT count(*)::int FROM app.decisions WHERE estimate_id=$1) AS decisions FROM app.estimates WHERE id=$1", [original])).rows[0];
    expect(originalRow).toEqual({ state: decisionFirst ? "accepted" : "superseded", decisions: decisionFirst ? 1 : 0 });
    expect((await raw.query("SELECT state FROM app.estimates WHERE id=$1", [replacement])).rows[0].state).toBe("issued");
    expect((await raw.query("SELECT state FROM app.work_orders WHERE id=$1", [workId])).rows[0].state).toBe("awaiting-approval");
    expect((await raw.query("SELECT count(*)::int AS n FROM app.audit_events WHERE estimate_id=$1 AND action='customer-accepted'", [original])).rows[0].n).toBe(decisionFirst ? 1 : 0);
  });

  it("serializes duplicate issue and identical or contradictory decision submissions", async () => {
    const workId = await plannedWork(11, 28);
    const estimateId = await createEstimate(manager, workId, [{ description: "Concurrent scope", quantity: 1, unitPrice: 100 }]);
    const issued = await queuedWorkRace(workId, () => issueEstimate(manager, estimateId), () => issueEstimate(adviser, estimateId));
    expect(issued.map((result) => result.status)).toEqual(["fulfilled", "rejected"]);
    if (issued[0].status !== "fulfilled" || typeof issued[0].value !== "string") throw new Error("Initial issue did not return a capability");
    const token = issued[0].value;
    const identical = await queuedWorkRace(workId, () => decideEstimate(token, "accepted"), () => decideEstimate(token, "accepted"));
    expect(identical.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"]);
    expect(identical.map((result) => result.status === "fulfilled" ? result.value : undefined)).toEqual(["recorded", "already-recorded"]);
    const next = await createEstimate(manager, workId, [{ description: "Contradictory scope", quantity: 1, unitPrice: 200 }]);
    const nextToken = await issueEstimate(manager, next);
    const contradictory = await queuedWorkRace(workId, () => decideEstimate(nextToken, "rejected"), () => decideEstimate(nextToken, "accepted"));
    expect(contradictory.map((result) => result.status)).toEqual(["fulfilled", "rejected"]);
    if (contradictory[1].status === "rejected") expect(contradictory[1].reason instanceof WorkflowError).toBe(true);
    expect((await raw.query("SELECT estimate_id,decision FROM app.decisions WHERE estimate_id=ANY($1::uuid[]) ORDER BY decision", [[estimateId, next]])).rows).toEqual([{ estimate_id: estimateId, decision: "accepted" }, { estimate_id: next, decision: "rejected" }]);
    expect((await raw.query("SELECT count(*)::int AS n FROM app.audit_events WHERE estimate_id=$1 AND action='estimate-issued'", [estimateId])).rows[0].n).toBe(1);
    expect((await raw.query("SELECT count(*)::int AS n FROM app.audit_events WHERE estimate_id=ANY($1::uuid[]) AND action IN ('customer-accepted','customer-rejected')", [[estimateId, next]])).rows[0].n).toBe(2);
  });

  it("rolls issue and decision state back when their audit insert fails", async () => {
    const workId = await plannedWork(9, 29);
    const original = await createEstimate(manager, workId, [{ description: "Prior scope", quantity: 1, unitPrice: 100 }]);
    await issueEstimate(manager, original);
    const estimateId = await createEstimate(manager, workId, [{ description: "Replacement scope", quantity: 1, unitPrice: 200 }]);
    await migrator.query(`CREATE FUNCTION app.test_fail_estimate_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action IN ('estimate-issued','customer-accepted') THEN RAISE EXCEPTION 'injected estimate audit failure' USING ERRCODE='P0001'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER test_fail_estimate_audit BEFORE INSERT ON app.audit_events FOR EACH ROW EXECUTE FUNCTION app.test_fail_estimate_audit()`);
    try {
      await expect(issueEstimate(manager, estimateId)).rejects.toThrow();
      expect((await raw.query("SELECT state,token_hash,issued_at,expires_at FROM app.estimates WHERE id=$1", [estimateId])).rows[0]).toEqual({ state: "draft", token_hash: null, issued_at: null, expires_at: null });
      expect((await raw.query("SELECT state FROM app.estimates WHERE id=$1", [original])).rows[0].state).toBe("issued");
      expect((await raw.query("SELECT count(*)::int AS n FROM app.audit_events WHERE estimate_id=$1 AND action='estimate-superseded'", [original])).rows[0].n).toBe(0);
      await migrator.query("ALTER TABLE app.audit_events DISABLE TRIGGER test_fail_estimate_audit");
      const token = await issueEstimate(manager, estimateId);
      await migrator.query("ALTER TABLE app.audit_events ENABLE TRIGGER test_fail_estimate_audit");
      await expect(decideEstimate(token, "accepted")).rejects.toThrow();
      expect((await raw.query("SELECT state FROM app.estimates WHERE id=$1", [estimateId])).rows[0].state).toBe("issued");
      expect((await raw.query("SELECT state FROM app.work_orders WHERE id=$1", [workId])).rows[0].state).toBe("awaiting-approval");
      expect((await raw.query("SELECT count(*)::int AS n FROM app.decisions WHERE estimate_id=$1", [estimateId])).rows[0].n).toBe(0);
      expect((await raw.query("SELECT count(*)::int AS n FROM app.audit_events WHERE estimate_id=$1 AND action='customer-accepted'", [estimateId])).rows[0].n).toBe(0);
    } finally {
      await migrator.query("DROP TRIGGER test_fail_estimate_audit ON app.audit_events; DROP FUNCTION app.test_fail_estimate_audit()");
    }
  });

  it("persists multi-line quantities, per-line VAT and exact monetary limits", async () => {
    const workId = await plannedWork(10, 29);
    const lines = [{ description: "Two small parts", quantity: 2, unitPrice: 3 }, { description: "Rounded separately", quantity: 1, unitPrice: 3 }];
    const estimateId = await createEstimate(manager, workId, lines);
    const token = await issueEstimate(manager, estimateId);
    const preview = await previewDecision(token);
    expect({ net: preview.net, tax: preview.tax, total: preview.total }).toEqual({ net: 9, tax: 2, total: 11 });
    expect(preview.lines).toEqual(expect.arrayContaining(lines));
    await expect(migrator.query("UPDATE app.estimate_lines SET quantity=3 WHERE estimate_id=$1", [estimateId])).rejects.toMatchObject({ code: "23514" });
    const limitLines = Array.from({ length: 50 }, (_, index) => ({ description: `Line ${index + 1}`, quantity: 2, unitPrice: 1000000 }));
    const limit = await createEstimate(manager, workId, limitLines);
    const limitToken = await issueEstimate(manager, limit);
    const limitPreview = await previewDecision(limitToken);
    expect(limitPreview.lines).toHaveLength(50);
    expect({ net: limitPreview.net, tax: limitPreview.tax, total: limitPreview.total }).toEqual({ net: 100000000, tax: 20000000, total: 120000000 });
    await expect(createEstimate(manager, workId, [{ description: "Over limit", quantity: 101, unitPrice: 1000000 }])).rejects.toThrow(WorkflowError);
    expect((await raw.query("SELECT count(*)::int AS n FROM app.estimates WHERE work_order_id=$1", [workId])).rows[0].n).toBe(2);
  });

  it("denies sensitive mutations for wrong-role, foreign, inactive and unassigned actors", async () => {
    const bookingId = await request(10, 30);
    const workId = await plannedWork(11, 30);
    const estimateId = await createEstimate(manager, workId, [{ description: "Protected scope", quantity: 1, unitPrice: 100 }]);
    const operatorMutations = (actor: Actor) => [
      () => allocate(actor, { bookingId, bayId, technicianId: technicianResourceId }),
      () => cancelBooking(actor, bookingId),
      () => checkIn(actor, bookingId),
      () => addTask(actor, workId, "Forbidden task"),
      () => createEstimate(actor, workId, [{ description: "Forbidden estimate", quantity: 1, unitPrice: 100 }]),
      () => issueEstimate(actor, estimateId),
      () => updateWork(actor, workId, "close"),
      () => recordAbsence(actor, secondBayId, slot(14, 30), slot(15, 30)),
    ];
    for (const actor of [technician, foreignManager]) {
      for (const operation of operatorMutations(actor)) await expect(operation()).rejects.toThrow(WorkflowError);
    }
    await expect(recordAbsence(adviser, secondBayId, slot(14, 30), slot(15, 30))).rejects.toThrow(WorkflowError);
    for (const operation of ["start", "task", "complete"] as const) {
      await expect(updateWork(otherTechnician, workId, operation, randomUUID())).rejects.toThrow(WorkflowError);
    }
    await migrator.query("UPDATE app.staff SET active=false WHERE id=$1", [managerId]);
    try {
      for (const operation of operatorMutations(manager)) await expect(operation()).rejects.toThrow(WorkflowError);
      await expect(updateWork(manager, workId, "start")).rejects.toThrow(WorkflowError);
    } finally {
      await migrator.query("UPDATE app.staff SET active=true WHERE id=$1", [managerId]);
    }
    expect((await raw.query("SELECT state FROM app.bookings WHERE id=$1", [bookingId])).rows[0].state).toBe("requested");
    expect((await raw.query("SELECT state FROM app.work_orders WHERE id=$1", [workId])).rows[0].state).toBe("ready");
    expect((await raw.query("SELECT state FROM app.estimates WHERE id=$1", [estimateId])).rows[0].state).toBe("draft");
    expect((await raw.query("SELECT count(*)::int AS n FROM app.tasks WHERE work_order_id=$1", [workId])).rows[0].n).toBe(1);
    expect((await raw.query("SELECT count(*)::int AS n FROM app.estimates WHERE work_order_id=$1", [workId])).rows[0].n).toBe(1);
  });

  it("enforces technician assignment, stale decisions, expiry, and 100-way shared-resource contention", async () => {
    const bookingId = await request(9);
    await allocate(manager, { bookingId, bayId, technicianId: technicianResourceId });
    const workId = await checkIn(manager, bookingId);
    await expect(updateWork(otherTechnician, workId, "start")).rejects.toThrow(WorkflowError);
    await expect(updateWork(foreignManager, workId, "start")).rejects.toThrow(WorkflowError);
    await addTask(manager, workId, "Approved service");
    const oldEstimate = await createEstimate(manager, workId, [{ description: "Old", quantity: 1, unitPrice: 100 }]);
    const oldToken = await issueEstimate(manager, oldEstimate);
    const newEstimate = await createEstimate(manager, workId, [{ description: "Updated", quantity: 1, unitPrice: 200 }]);
    const newToken = await issueEstimate(manager, newEstimate);
    await expect(previewDecision(oldToken)).rejects.toThrow(WorkflowError);
    await expect(decideEstimate(oldToken, "accepted")).rejects.toThrow(WorkflowError);
    await migrator.query("ALTER TABLE app.estimates DISABLE TRIGGER estimate_guard");
    try {
      await migrator.query("UPDATE app.estimates SET issued_at=now()-interval '2 seconds',expires_at=now()-interval '1 second' WHERE id=$1", [newEstimate]);
    } finally {
      await migrator.query("ALTER TABLE app.estimates ENABLE TRIGGER estimate_guard");
    }
    await expect(previewDecision(newToken)).rejects.toThrow(WorkflowError);
    await expect(decideEstimate(newToken, "accepted")).rejects.toThrow(WorkflowError);
    await expect(issueEstimate(adviser, oldEstimate)).rejects.toThrow(WorkflowError);

    const contenders = await Promise.all(Array.from({ length: 100 }, (_, i) => createRequest({ workshopId, name: `Contender ${i}`, email: "fixture@example.test", registration: `C${i}`, startAt: slot(16).toISOString() })));
    const started = performance.now();
    const attempts = await Promise.allSettled(contenders.map((id) => allocate(manager, { bookingId: id, bayId: secondBayId, technicianId: secondTechnicianResourceId })));
    const elapsedMs = Math.round(performance.now() - started);
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((r) => r.status === "rejected" && r.reason instanceof WorkflowError)).toHaveLength(99);
    expect((await raw.query("SELECT count(*)::int AS n FROM app.allocations WHERE booking_id=ANY($1::uuid[]) AND released_at IS NULL", [contenders])).rows[0].n).toBe(2);
    expect(pool.options.max).toBe(5);
    const version = (await raw.query("SHOW server_version")).rows[0].server_version;
    process.stdout.write(`100 booking attempts: 1 allocated, 99 controlled conflicts, 2 active allocations; allocation phase ${elapsedMs}ms; pool max ${pool.options.max}; PostgreSQL ${version}. Diagnostic sample, not a throughput claim.\n`);

    const wrongRole = await request(13, 10);
    await expect(allocate(technician, { bookingId: wrongRole, bayId, technicianId: technicianResourceId })).rejects.toThrow(WorkflowError);
    const forged = await request(14, 10);
    await expect(allocate({ ...manager, role: "technician" }, { bookingId: forged, bayId, technicianId: technicianResourceId })).rejects.toThrow(WorkflowError);
    await migrator.query("UPDATE app.staff SET active=false WHERE id=$1", [otherManagerId]);
    await expect(workspace(foreignManager)).rejects.toThrow(WorkflowError);

    const incomplete = await request(12, 10);
    await allocate(manager, { bookingId: incomplete, bayId, technicianId: technicianResourceId });
    const incompleteWork = await checkIn(manager, incomplete);
    await updateWork(technician, incompleteWork, "start");
    await expect(updateWork(technician, incompleteWork, "complete")).rejects.toThrow(WorkflowError);
    await addTask(manager, incompleteWork, "Still awaiting approval");
    await expect(updateWork(technician, incompleteWork, "complete")).rejects.toThrow(WorkflowError);
  });
});
