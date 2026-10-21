import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { admin, connect } from "../../scripts/db/local.mts";
import { pool } from "../db/index.ts";
import { addTask, allocate, cancelBooking, checkIn, createEstimate, createRequest, decideEstimate, issueEstimate, previewDecision, recordAbsence, updateWork, workspace, type Actor } from "./service.ts";
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

    const raceOld = await createEstimate(manager, workId, [{ description: "Current approval", quantity: 1, unitPrice: 300 }]);
    const raceToken = await issueEstimate(manager, raceOld);
    const raceNew = await createEstimate(manager, workId, [{ description: "Revised approval", quantity: 1, unitPrice: 400 }]);
    const race = await Promise.allSettled([decideEstimate(raceToken, "accepted"), issueEstimate(manager, raceNew)]);
    expect(race[1].status).toBe("fulfilled");
    const raceState = await raw.query(`SELECT e.state, (SELECT count(*)::int FROM app.decisions d WHERE d.estimate_id=e.id) AS decisions
      FROM app.estimates e WHERE e.id=$1`, [raceOld]);
    expect([["accepted", 1], ["superseded", 0]]).toContainEqual([raceState.rows[0].state, raceState.rows[0].decisions]);
    expect((await raw.query("SELECT state FROM app.estimates WHERE id=$1", [raceNew])).rows[0].state).toBe("issued");

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
