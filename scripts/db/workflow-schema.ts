import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, integer, jsonb, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { app, resources, staff, workshops } from "./schema.ts";

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
export const customers = app.table("customers", {
  id: uuid().defaultRandom().primaryKey(), workshopId: uuid("workshop_id").notNull().references(() => workshops.id),
  name: text().notNull(), email: text().notNull(),
}, (t) => [unique("customers_scope_key").on(t.workshopId, t.id), check("customer_text_check", sql`length(btrim(${t.name})) BETWEEN 1 AND 120 AND length(${t.email}) BETWEEN 3 AND 254`)]);

export const vehicles = app.table("vehicles", {
  id: uuid().defaultRandom().primaryKey(), workshopId: uuid("workshop_id").notNull().references(() => workshops.id),
  customerId: uuid("customer_id").notNull(), registration: text().notNull(),
}, (t) => [unique("vehicles_scope_key").on(t.workshopId, t.id, t.customerId),
  foreignKey({ columns: [t.workshopId, t.customerId], foreignColumns: [customers.workshopId, customers.id] }),
  check("registration_check", sql`length(btrim(${t.registration})) BETWEEN 1 AND 20`)]);

export const bookings = app.table("bookings", {
  id: uuid().defaultRandom().primaryKey(), workshopId: uuid("workshop_id").notNull().references(() => workshops.id),
  customerId: uuid("customer_id").notNull(), vehicleId: uuid("vehicle_id").notNull(),
  startAt: instant("start_at").notNull(), endAt: instant("end_at").notNull(),
  state: text({ enum: ["requested", "confirmed", "rejected", "cancelled", "checked-in"] }).default("requested").notNull(),
  createdAt: instant("created_at").defaultNow().notNull(),
}, (t) => [unique("bookings_scope_key").on(t.workshopId, t.id),
  foreignKey({ columns: [t.workshopId, t.vehicleId, t.customerId], foreignColumns: [vehicles.workshopId, vehicles.id, vehicles.customerId] }),
  check("booking_interval_check", sql`isfinite(${t.startAt}) AND isfinite(${t.endAt}) AND ${t.endAt} = ${t.startAt} + interval '60 minutes'`),
  check("booking_state_check", sql`${t.state} IN ('requested','confirmed','rejected','cancelled','checked-in')`)]);

export const allocations = app.table("allocations", {
  id: uuid().defaultRandom().primaryKey(), workshopId: uuid("workshop_id").notNull(), bookingId: uuid("booking_id").notNull(),
  resourceId: uuid("resource_id").notNull(), kind: text({ enum: ["bay", "technician"] }).notNull(),
  startAt: instant("start_at").notNull(), endAt: instant("end_at").notNull(), releasedAt: instant("released_at"),
}, (t) => [foreignKey({ columns: [t.workshopId, t.bookingId], foreignColumns: [bookings.workshopId, bookings.id] }),
  foreignKey({ columns: [t.workshopId, t.resourceId], foreignColumns: [resources.workshopId, resources.id] }),
  check("allocation_interval_check", sql`isfinite(${t.startAt}) AND isfinite(${t.endAt}) AND ${t.startAt} < ${t.endAt}`),
  check("allocation_kind_check", sql`${t.kind} IN ('bay','technician')`)]);

export const absences = app.table("absences", {
  id: uuid().defaultRandom().primaryKey(), workshopId: uuid("workshop_id").notNull(), resourceId: uuid("resource_id").notNull(),
  startAt: instant("start_at").notNull(), endAt: instant("end_at").notNull(),
}, (t) => [foreignKey({ columns: [t.workshopId, t.resourceId], foreignColumns: [resources.workshopId, resources.id] }),
  check("absence_interval_check", sql`isfinite(${t.startAt}) AND isfinite(${t.endAt}) AND ${t.startAt} < ${t.endAt}`)]);

export const workOrders = app.table("work_orders", {
  id: uuid().defaultRandom().primaryKey(), workshopId: uuid("workshop_id").notNull(), bookingId: uuid("booking_id").notNull().unique(),
  technicianId: uuid("technician_id").notNull(), state: text({ enum: ["ready", "in-progress", "awaiting-approval", "completed", "closed"] }).default("ready").notNull(),
}, (t) => [unique("work_orders_scope_key").on(t.workshopId, t.id),
  foreignKey({ columns: [t.workshopId, t.bookingId], foreignColumns: [bookings.workshopId, bookings.id] }),
  foreignKey({ columns: [t.workshopId, t.technicianId], foreignColumns: [staff.workshopId, staff.id] }),
  check("work_order_state_check", sql`${t.state} IN ('ready','in-progress','awaiting-approval','completed','closed')`)]);

export const tasks = app.table("tasks", {
  id: uuid().defaultRandom().primaryKey(), workshopId: uuid("workshop_id").notNull(), workOrderId: uuid("work_order_id").notNull(),
  description: text().notNull(), done: boolean().default(false).notNull(),
}, (t) => [foreignKey({ columns: [t.workshopId, t.workOrderId], foreignColumns: [workOrders.workshopId, workOrders.id] }),
  check("task_description_check", sql`length(btrim(${t.description})) BETWEEN 1 AND 500`)]);

export const estimates = app.table("estimates", {
  id: uuid().defaultRandom().primaryKey(), workshopId: uuid("workshop_id").notNull(), workOrderId: uuid("work_order_id").notNull(),
  version: integer().notNull(), state: text({ enum: ["draft", "issued", "accepted", "rejected", "expired", "superseded"] }).default("draft").notNull(),
  currency: text().default("GBP").notNull(), net: integer().notNull(), tax: integer().notNull(), total: integer().notNull(),
  tokenHash: text("token_hash"), expiresAt: instant("expires_at"), issuedAt: instant("issued_at"),
}, (t) => [unique("estimate_version_key").on(t.workOrderId, t.version), unique("estimate_scope_key").on(t.workshopId, t.id), unique("estimate_token_key").on(t.tokenHash),
  foreignKey({ columns: [t.workshopId, t.workOrderId], foreignColumns: [workOrders.workshopId, workOrders.id] }),
  check("estimate_money_check", sql`${t.version} > 0 AND ${t.currency}='GBP' AND ${t.net} BETWEEN 0 AND 100000000 AND ${t.tax} BETWEEN 0 AND 20000000 AND ${t.total}=${t.net}+${t.tax}`),
  check("estimate_state_check", sql`${t.state} IN ('draft','issued','accepted','rejected','expired','superseded')`),
  check("estimate_issue_check", sql`${t.state}='draft' OR (${t.tokenHash} IS NOT NULL AND ${t.tokenHash} ~ '^[a-f0-9]{64}$' AND ${t.expiresAt} IS NOT NULL AND ${t.issuedAt} IS NOT NULL AND isfinite(${t.expiresAt}) AND ${t.expiresAt}>${t.issuedAt})`)]);

export const estimateLines = app.table("estimate_lines", {
  id: uuid().defaultRandom().primaryKey(), workshopId: uuid("workshop_id").notNull(), estimateId: uuid("estimate_id").notNull(),
  description: text().notNull(), quantity: integer().notNull(), unitPrice: integer("unit_price").notNull(),
}, (t) => [foreignKey({ columns: [t.workshopId, t.estimateId], foreignColumns: [estimates.workshopId, estimates.id] }),
  check("line_values_check", sql`length(btrim(${t.description})) BETWEEN 1 AND 500 AND ${t.quantity} BETWEEN 1 AND 1000 AND ${t.unitPrice} BETWEEN 0 AND 1000000`)]);

export const decisions = app.table("decisions", {
  id: uuid().defaultRandom().primaryKey(), workshopId: uuid("workshop_id").notNull(), estimateId: uuid("estimate_id").notNull().unique(),
  decision: text({ enum: ["accepted", "rejected"] }).notNull(), createdAt: instant("created_at").defaultNow().notNull(),
}, (t) => [foreignKey({ columns: [t.workshopId, t.estimateId], foreignColumns: [estimates.workshopId, estimates.id] }),
  check("decision_check", sql`${t.decision} IN ('accepted','rejected')`)]);

export const auditEvents = app.table("audit_events", {
  id: uuid().defaultRandom().primaryKey(), workshopId: uuid("workshop_id").notNull(),
  bookingId: uuid("booking_id"), workOrderId: uuid("work_order_id"), estimateId: uuid("estimate_id"), resourceId: uuid("resource_id"),
  actorId: uuid("actor_id"), action: text().notNull(), details: jsonb().$type<Record<string, string>>().default({}).notNull(),
  createdAt: instant("created_at").defaultNow().notNull(),
}, (t) => [foreignKey({ columns: [t.workshopId, t.bookingId], foreignColumns: [bookings.workshopId, bookings.id] }),
  foreignKey({ columns: [t.workshopId, t.workOrderId], foreignColumns: [workOrders.workshopId, workOrders.id] }),
  foreignKey({ columns: [t.workshopId, t.estimateId], foreignColumns: [estimates.workshopId, estimates.id] }),
  foreignKey({ columns: [t.workshopId, t.actorId], foreignColumns: [staff.workshopId, staff.id] }),
  foreignKey({ columns: [t.workshopId, t.resourceId], foreignColumns: [resources.workshopId, resources.id] }),
  check("audit_reference_check", sql`num_nonnulls(${t.bookingId},${t.workOrderId},${t.estimateId},${t.resourceId}) = 1`)]);
