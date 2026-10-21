import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { resources, staff, workshops } from "../../scripts/db/schema.ts";
import { absences, allocations, auditEvents, bookings, customers, decisions, estimateLines, estimates, tasks, vehicles, workOrders } from "../../scripts/db/workflow-schema.ts";
import { ensure, linesInput, requestInput, totals, uuid, WorkflowError } from "./rules.ts";

export type Actor = { id: string; workshopId: string; authUserId: string; role: string };
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const scope = (actor: Actor) => and(eq(staff.id, actor.id), eq(staff.workshopId, actor.workshopId), eq(staff.authUserId, actor.authUserId), eq(staff.active, true));
async function withActor<T>(actor: Actor, roles: string[], run: (tx: Transaction) => Promise<T>): Promise<T> {
  uuid.parse(actor.workshopId);
  return db.transaction(async (tx) => {
    const [member] = await tx.select().from(staff).where(scope(actor)).for("share");
    ensure(member && roles.includes(member.role) && member.role === actor.role, "Permission denied.");
    return run(tx);
  });
}
const operators = ["manager", "adviser"];
const allStaff = [...operators, "technician"];
async function audit(tx: Transaction, workshopId: string, actorId: string | null, reference: { bookingId?: string; workOrderId?: string; estimateId?: string; resourceId?: string }, action: string) {
  await tx.insert(auditEvents).values({ workshopId, actorId, ...reference, action });
}
async function lockBooking(tx: Transaction, actor: Actor, id: string) {
  const [booking] = await tx.select().from(bookings).where(and(eq(bookings.id, uuid.parse(id)), eq(bookings.workshopId, actor.workshopId))).for("update");
  ensure(booking, "Booking not found.");
  return booking;
}
async function lockWork(tx: Transaction, actor: Actor, id: string) {
  const [work] = await tx.select().from(workOrders).where(and(eq(workOrders.id, uuid.parse(id)), eq(workOrders.workshopId, actor.workshopId))).for("update");
  ensure(work && (actor.role !== "technician" || work.technicianId === actor.id), "Work order not found or not assigned to you.");
  return work;
}

export async function createRequest(input: unknown) {
  const data = requestInput.parse(input);
  ensure(data.workshopId === process.env.BAYFRAME_WORKSHOP_ID, "Workshop is not accepting requests.");
  const endAt = new Date(data.startAt.getTime() + 3600000);
  return db.transaction(async (tx) => {
    const slot = await tx.execute(sql`SELECT app.valid_slot(${data.workshopId}::uuid, ${data.startAt.toISOString()}::timestamptz, ${endAt.toISOString()}::timestamptz) AS valid`);
    ensure(slot.rows[0]?.valid && data.startAt.getTime() > Date.now(), "Choose a future 60-minute slot within Monday–Friday 09:00–17:00 workshop time.");
    const [customer] = await tx.insert(customers).values({ workshopId: data.workshopId, name: data.name, email: data.email }).returning();
    const [vehicle] = await tx.insert(vehicles).values({ workshopId: data.workshopId, customerId: customer.id, registration: data.registration }).returning();
    const [booking] = await tx.insert(bookings).values({ workshopId: data.workshopId, customerId: customer.id, vehicleId: vehicle.id, startAt: data.startAt, endAt }).returning();
    await audit(tx, data.workshopId, null, { bookingId: booking.id }, "requested");
    return booking.id;
  });
}

export async function availability(workshopId: string, start: string) {
  ensure(uuid.parse(workshopId) === process.env.BAYFRAME_WORKSHOP_ID, "Workshop is not accepting requests.");
  const date = requestInput.shape.startAt.parse(start);
  ensure(date.getTime() > Date.now(), "Choose a future time.");
  const end = new Date(date.getTime() + 3600000);
  const result = await db.execute(sql`SELECT r.type, count(*)::integer AS count FROM app.resources r
    WHERE r.workshop_id=${workshopId}::uuid AND r.active
      AND app.valid_slot(r.workshop_id,${date.toISOString()}::timestamptz,${end.toISOString()}::timestamptz)
      AND (r.type='bay' OR EXISTS(SELECT 1 FROM app.staff s WHERE s.id=r.staff_id AND s.workshop_id=r.workshop_id AND s.active))
      AND NOT EXISTS(SELECT 1 FROM app.allocations a WHERE a.resource_id=r.id AND a.released_at IS NULL AND tstzrange(a.start_at,a.end_at,'[)') && tstzrange(${date.toISOString()}::timestamptz,${end.toISOString()}::timestamptz,'[)'))
      AND NOT EXISTS(SELECT 1 FROM app.absences a WHERE a.resource_id=r.id AND tstzrange(a.start_at,a.end_at,'[)') && tstzrange(${date.toISOString()}::timestamptz,${end.toISOString()}::timestamptz,'[)')) GROUP BY r.type`);
  return { bays: Number(result.rows.find((r) => r.type === "bay")?.count ?? 0), technicians: Number(result.rows.find((r) => r.type === "technician")?.count ?? 0) };
}

export async function allocate(actor: Actor, input: { bookingId: string; bayId: string; technicianId: string; startAt?: Date }) {
  uuid.parse(input.bayId); uuid.parse(input.technicianId);
  ensure(input.bayId !== input.technicianId, "Choose a bay and a technician.");
  try {
    return await withActor(actor, operators, async (tx) => {
      const booking = await lockBooking(tx, actor, input.bookingId);
      ensure(input.startAt ? booking.state === "confirmed" : booking.state === "requested", "Booking state no longer permits this operation.");
      const startAt = input.startAt ?? booking.startAt;
      ensure(Number.isFinite(startAt.getTime()) && startAt.getTime() > Date.now(), "Choose a future time.");
      const endAt = new Date(startAt.getTime() + 3600000);
      const old = await tx.select().from(allocations).where(and(eq(allocations.bookingId, booking.id), isNull(allocations.releasedAt)));
      const ids = [...new Set([...old.map((a) => a.resourceId), input.bayId, input.technicianId])].sort();
      const locked = await tx.select().from(resources).where(and(eq(resources.workshopId, actor.workshopId), inArray(resources.id, ids))).orderBy(asc(resources.id)).for("update");
      const bay = locked.find((r) => r.id === input.bayId);
      const technician = locked.find((r) => r.id === input.technicianId);
      ensure(bay?.active && bay.type === "bay" && technician?.active && technician.type === "technician" && technician.staffId, "Resources must be active and the technician must have a staff link.");
      if (input.startAt) {
        await tx.update(allocations).set({ releasedAt: new Date() }).where(and(eq(allocations.bookingId, booking.id), isNull(allocations.releasedAt)));
        await tx.update(bookings).set({ startAt, endAt }).where(eq(bookings.id, booking.id));
      }
      await tx.insert(allocations).values([
        { workshopId: actor.workshopId, bookingId: booking.id, resourceId: bay.id, kind: "bay", startAt, endAt },
        { workshopId: actor.workshopId, bookingId: booking.id, resourceId: technician.id, kind: "technician", startAt, endAt },
      ]);
      await tx.update(bookings).set({ state: "confirmed" }).where(eq(bookings.id, booking.id));
      await audit(tx, actor.workshopId, actor.id, { bookingId: booking.id }, input.startAt ? "rescheduled" : "confirmed");
    });
  } catch (error) {
    const cause = error && typeof error === "object" && "cause" in error ? error.cause : error;
    const code = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
    if (code === "23P01" || code === "23505" || code === "23514") throw new WorkflowError("Resources are unavailable or outside permitted hours. Refresh and choose another slot.");
    throw error;
  }
}

export async function cancelBooking(actor: Actor, id: string, reject = false) {
  return withActor(actor, operators, async (tx) => {
    const booking = await lockBooking(tx, actor, id);
    ensure(reject ? booking.state === "requested" : ["requested", "confirmed"].includes(booking.state), "Booking cannot be cancelled or rejected in its current state.");
    await tx.update(allocations).set({ releasedAt: new Date() }).where(and(eq(allocations.bookingId, id), isNull(allocations.releasedAt)));
    await tx.update(bookings).set({ state: reject ? "rejected" : "cancelled" }).where(eq(bookings.id, id));
    await audit(tx, actor.workshopId, actor.id, { bookingId: id }, reject ? "rejected" : "cancelled");
  });
}

export async function checkIn(actor: Actor, id: string) {
  return withActor(actor, operators, async (tx) => {
    const booking = await lockBooking(tx, actor, id);
    ensure(booking.state === "confirmed", "Only confirmed bookings can check in.");
    const [allocation] = await tx.select({ staffId: resources.staffId }).from(allocations).innerJoin(resources, eq(resources.id, allocations.resourceId))
      .where(and(eq(allocations.bookingId, id), eq(allocations.kind, "technician"), isNull(allocations.releasedAt)));
    ensure(allocation?.staffId, "The allocated technician has no staff assignment.");
    const [member] = await tx.select().from(staff).where(and(eq(staff.id, allocation.staffId), eq(staff.active, true))).for("share");
    ensure(member, "Allocated staff membership is inactive.");
    const [work] = await tx.insert(workOrders).values({ workshopId: actor.workshopId, bookingId: id, technicianId: allocation.staffId }).returning();
    await tx.update(bookings).set({ state: "checked-in" }).where(eq(bookings.id, id));
    await audit(tx, actor.workshopId, actor.id, { workOrderId: work.id }, "checked-in");
    return work.id;
  });
}

export async function addTask(actor: Actor, workId: string, description: string) {
  ensure(description.trim().length > 0 && description.trim().length <= 500, "Task description must contain 1–500 characters.");
  return withActor(actor, operators, async (tx) => {
    const work = await lockWork(tx, actor, workId);
    ensure(["ready", "in-progress"].includes(work.state), "Tasks can only be added before approval or completion.");
    const [estimate] = await tx.select().from(estimates).where(eq(estimates.workOrderId, work.id)).orderBy(sql`${estimates.version} DESC`).limit(1);
    ensure(!estimate || ["draft", "rejected", "expired"].includes(estimate.state), "Issue a new scope only after the current estimate is resolved.");
    await tx.insert(tasks).values({ workshopId: actor.workshopId, workOrderId: work.id, description: description.trim() });
    await audit(tx, actor.workshopId, actor.id, { workOrderId: work.id }, "task-added");
  });
}

export async function updateWork(actor: Actor, id: string, operation: "start" | "complete" | "close" | "task", taskId?: string) {
  return withActor(actor, operation === "close" ? operators : allStaff, async (tx) => {
    const work = await lockWork(tx, actor, id);
    if (operation === "task") {
      ensure(work.state === "in-progress", "Work must be in progress.");
      const [approved] = await tx.select().from(estimates).where(eq(estimates.workOrderId, work.id)).orderBy(sql`${estimates.version} DESC`).limit(1);
      ensure(approved?.state === "accepted", "Customer approval is required before completing tasks.");
      const changed = await tx.update(tasks).set({ done: true }).where(and(eq(tasks.id, uuid.parse(taskId)), eq(tasks.workOrderId, work.id), eq(tasks.done, false))).returning();
      ensure(changed.length === 1, "Task is missing or already complete.");
    } else {
      const next = { start: "in-progress", complete: "completed", close: "closed" } as const;
      ensure(work.state === ({ start: "ready", complete: "in-progress", close: "completed" } as const)[operation], "Work-order transition is not permitted.");
      if (operation === "complete") {
        const workTasks = await tx.select().from(tasks).where(eq(tasks.workOrderId, work.id));
        const [latest] = await tx.select().from(estimates).where(eq(estimates.workOrderId, work.id)).orderBy(sql`${estimates.version} DESC`).limit(1);
        ensure(workTasks.length && workTasks.every((t) => t.done) && latest?.state === "accepted", "All tasks and the latest customer approval are required.");
      }
      await tx.update(workOrders).set({ state: next[operation] }).where(eq(workOrders.id, work.id));
      if (operation === "close") await tx.update(allocations).set({ releasedAt: new Date() }).where(and(eq(allocations.bookingId, work.bookingId), isNull(allocations.releasedAt)));
    }
    await audit(tx, actor.workshopId, actor.id, { workOrderId: work.id }, operation === "task" ? "task-completed" : operation);
  });
}

export async function createEstimate(actor: Actor, workId: string, input: unknown) {
  const lines = linesInput.parse(input), amounts = totals(lines);
  return withActor(actor, operators, async (tx) => {
    const work = await lockWork(tx, actor, workId);
    ensure(!["completed", "closed"].includes(work.state), "Completed work cannot receive another estimate.");
    const [latest] = await tx.select().from(estimates).where(eq(estimates.workOrderId, work.id)).orderBy(sql`${estimates.version} DESC`).limit(1);
    const [estimate] = await tx.insert(estimates).values({ workshopId: actor.workshopId, workOrderId: work.id, version: (latest?.version ?? 0) + 1, ...amounts }).returning();
    await tx.insert(estimateLines).values(lines.map((line) => ({ ...line, workshopId: actor.workshopId, estimateId: estimate.id })));
    await audit(tx, actor.workshopId, actor.id, { estimateId: estimate.id }, "estimate-drafted");
    return estimate.id;
  });
}
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function issueEstimate(actor: Actor, id: string) {
  return withActor(actor, operators, async (tx) => {
    const [ref] = await tx.select().from(estimates).where(and(eq(estimates.id, uuid.parse(id)), eq(estimates.workshopId, actor.workshopId)));
    ensure(ref, "Estimate not found.");
    const work = await lockWork(tx, actor, ref.workOrderId);
    ensure(!["completed", "closed"].includes(work.state), "Work is already completed.");
    const [latest] = await tx.select().from(estimates).where(eq(estimates.workOrderId, work.id)).orderBy(sql`${estimates.version} DESC`).limit(1).for("update");
    ensure(latest?.id === id && latest.state === "draft", "Only the newest draft may be issued.");
    const lines = await tx.select().from(estimateLines).where(eq(estimateLines.estimateId, id));
    const amounts = totals(lines);
    ensure(amounts.total === latest.total && amounts.net === latest.net && amounts.tax === latest.tax, "Estimate totals do not match its lines.");
    const workTasks = await tx.select().from(tasks).where(eq(tasks.workOrderId, work.id));
    ensure(workTasks.length, "Add the work tasks before issuing an estimate.");
    const superseded = await tx.update(estimates).set({ state: "superseded" }).where(and(eq(estimates.workOrderId, work.id), eq(estimates.state, "issued"))).returning();
    for (const prior of superseded) await audit(tx, actor.workshopId, actor.id, { estimateId: prior.id }, "estimate-superseded");
    const token = randomBytes(32).toString("hex"), issuedAt = new Date(), expiresAt = new Date(issuedAt.getTime() + 48 * 3600000);
    await tx.update(estimates).set({ state: "issued", tokenHash: tokenHash(token), issuedAt, expiresAt }).where(eq(estimates.id, id));
    await tx.update(workOrders).set({ state: "awaiting-approval" }).where(eq(workOrders.id, work.id));
    await audit(tx, actor.workshopId, actor.id, { estimateId: id }, "estimate-issued");
    return token;
  });
}

function validateToken(token: string) { ensure(/^[a-f0-9]{64}$/.test(token), "Decision link is invalid or unavailable."); }
export async function previewDecision(token: string) {
  validateToken(token);
  const [estimate] = await db.select({ id: estimates.id, workOrderId: estimates.workOrderId, version: estimates.version, state: estimates.state, net: estimates.net, tax: estimates.tax, total: estimates.total, expiresAt: estimates.expiresAt })
    .from(estimates).where(eq(estimates.tokenHash, tokenHash(token)));
  ensure(estimate && estimate.state !== "superseded" && estimate.expiresAt && estimate.expiresAt.getTime() > Date.now(), "Decision link is expired or unavailable.");
  const [latest] = await db.select({ id: estimates.id }).from(estimates).where(eq(estimates.workOrderId, estimate.workOrderId)).orderBy(sql`${estimates.version} DESC`).limit(1);
  ensure(latest.id === estimate.id, "Decision link has been replaced by a newer version.");
  const lines = await db.select({ description: estimateLines.description, quantity: estimateLines.quantity, unitPrice: estimateLines.unitPrice }).from(estimateLines).where(eq(estimateLines.estimateId, estimate.id));
  return { id: estimate.id, version: estimate.version, state: estimate.state, net: estimate.net, tax: estimate.tax, total: estimate.total, expiresAt: estimate.expiresAt, lines };
}

export async function decideEstimate(token: string, decision: "accepted" | "rejected") {
  validateToken(token); ensure(["accepted", "rejected"].includes(decision), "Choose accept or reject.");
  return db.transaction(async (tx) => {
    const [ref] = await tx.select().from(estimates).where(eq(estimates.tokenHash, tokenHash(token)));
    ensure(ref, "Decision link is invalid or unavailable.");
    // Issue and decision take the work-order lock first to serialize version changes.
    const [work] = await tx.select().from(workOrders).where(eq(workOrders.id, ref.workOrderId)).for("update");
    ensure(work, "Work order is unavailable.");
    const [estimate] = await tx.select().from(estimates).where(eq(estimates.id, ref.id)).for("update");
    const [latest] = await tx.select().from(estimates).where(eq(estimates.workOrderId, work.id)).orderBy(sql`${estimates.version} DESC`).limit(1);
    ensure(latest.id === estimate.id && estimate.expiresAt && estimate.expiresAt.getTime() > Date.now(), "Estimate is expired or replaced by a newer version.");
    const [prior] = await tx.select().from(decisions).where(eq(decisions.estimateId, estimate.id));
    if (prior) { ensure(prior.decision === decision, "A different decision has already been recorded."); return "already-recorded"; }
    ensure(estimate.state === "issued", "Estimate is superseded or already resolved.");
    await tx.insert(decisions).values({ workshopId: estimate.workshopId, estimateId: estimate.id, decision });
    await tx.update(estimates).set({ state: decision }).where(eq(estimates.id, estimate.id));
    await tx.update(workOrders).set({ state: "in-progress" }).where(eq(workOrders.id, work.id));
    await audit(tx, estimate.workshopId, null, { estimateId: estimate.id }, `customer-${decision}`);
    return "recorded";
  });
}

export async function recordAbsence(actor: Actor, resourceId: string, startAt: Date, endAt: Date) {
  uuid.parse(resourceId); ensure(Number.isFinite(startAt.getTime()) && Number.isFinite(endAt.getTime()) && startAt < endAt, "Absence must have a valid start and end.");
  return withActor(actor, ["manager"], async (tx) => {
    const [resource] = await tx.select().from(resources).where(and(eq(resources.id, resourceId), eq(resources.workshopId, actor.workshopId))).for("update");
    ensure(resource, "Resource not found.");
    await tx.insert(absences).values({ workshopId: actor.workshopId, resourceId, startAt, endAt });
    await audit(tx, actor.workshopId, actor.id, { resourceId }, "absence-recorded");
  });
}

export async function workspace(actor: Actor) {
  return withActor(actor, allStaff, async (tx) => {
    const [workshop] = await tx.select().from(workshops).where(eq(workshops.id, actor.workshopId));
    const resourceRows = await tx.select({ id: resources.id, name: resources.name, type: resources.type, active: resources.active }).from(resources).where(eq(resources.workshopId, actor.workshopId)).orderBy(resources.type, resources.name);
    const workRows = await tx.select().from(workOrders).where(and(eq(workOrders.workshopId, actor.workshopId), actor.role === "technician" ? eq(workOrders.technicianId, actor.id) : undefined));
    const workIds = workRows.map((w) => w.id);
    const taskRows = workIds.length ? await tx.select().from(tasks).where(inArray(tasks.workOrderId, workIds)) : [];
    if (actor.role === "technician") {
      const assignedSchedule = await tx.select({ bookingId: bookings.id, startAt: bookings.startAt, endAt: bookings.endAt, state: bookings.state }).from(allocations)
        .innerJoin(resources, eq(resources.id, allocations.resourceId)).innerJoin(bookings, eq(bookings.id, allocations.bookingId))
        .where(and(eq(allocations.workshopId, actor.workshopId), eq(resources.staffId, actor.id), eq(allocations.kind, "technician"), isNull(allocations.releasedAt))).orderBy(bookings.startAt);
      return { workshop, assignedSchedule, resources: [], bookings: [], allocations: [], workOrders: workRows, tasks: taskRows, estimates: [], lines: [], audit: [], absences: [] };
    }
    const bookingRows = await tx.select({ id: bookings.id, state: bookings.state, startAt: bookings.startAt, endAt: bookings.endAt, name: customers.name, email: customers.email, registration: vehicles.registration })
      .from(bookings).innerJoin(customers, eq(customers.id, bookings.customerId)).innerJoin(vehicles, eq(vehicles.id, bookings.vehicleId)).where(eq(bookings.workshopId, actor.workshopId)).orderBy(bookings.startAt);
    const estimateRows = await tx.select({ id: estimates.id, workOrderId: estimates.workOrderId, version: estimates.version, state: estimates.state, net: estimates.net, tax: estimates.tax, total: estimates.total }).from(estimates).where(eq(estimates.workshopId, actor.workshopId)).orderBy(estimates.version);
    const lineRows = await tx.select().from(estimateLines).where(eq(estimateLines.workshopId, actor.workshopId));
    const reservationRows = await tx.select({ id: allocations.id, resourceId: allocations.resourceId, bookingId: allocations.bookingId, startAt: allocations.startAt, endAt: allocations.endAt }).from(allocations).where(and(eq(allocations.workshopId, actor.workshopId), isNull(allocations.releasedAt)));
    const auditRows = actor.role === "manager" ? await tx.select({ id: auditEvents.id, action: auditEvents.action, createdAt: auditEvents.createdAt, actorId: auditEvents.actorId }).from(auditEvents).where(eq(auditEvents.workshopId, actor.workshopId)).orderBy(sql`${auditEvents.createdAt} DESC`).limit(100) : [];
    return { workshop, assignedSchedule: [], resources: resourceRows, bookings: bookingRows, allocations: reservationRows, workOrders: workRows, tasks: taskRows, estimates: estimateRows, lines: lineRows, audit: auditRows, absences: await tx.select().from(absences).where(eq(absences.workshopId, actor.workshopId)) };
  });
}
