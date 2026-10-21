import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, pgSchema, text, unique, uuid } from "drizzle-orm/pg-core";

export const app = pgSchema("app");

// Reference only: Supabase owns this table and its migrations.
const authUsers = pgSchema("auth").table("users", { id: uuid().primaryKey() });

export const workshops = app.table("workshops", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  timezone: text().notNull(),
}, (table) => [
  check("workshops_name_check", sql`${table.name} = btrim(${table.name}) AND length(${table.name}) > 0`),
  check("workshops_timezone_check", sql`app.valid_timezone(${table.timezone})`),
]);

export const staff = app.table("staff", {
  id: uuid().defaultRandom().primaryKey(),
  workshopId: uuid("workshop_id").notNull().references(() => workshops.id, { onDelete: "restrict", onUpdate: "restrict" }),
  authUserId: uuid("auth_user_id").notNull().references(() => authUsers.id, { onDelete: "restrict", onUpdate: "restrict" }),
  role: text({ enum: ["manager", "adviser", "technician"] }).notNull(),
  active: boolean().default(true).notNull(),
}, (table) => [
  unique("staff_workshop_user_key").on(table.workshopId, table.authUserId),
  unique("staff_workshop_id_key").on(table.workshopId, table.id),
  check("staff_role_check", sql`${table.role} IN ('manager', 'adviser', 'technician')`),
]);

export const resources = app.table("resources", {
  id: uuid().defaultRandom().primaryKey(),
  workshopId: uuid("workshop_id").notNull().references(() => workshops.id, { onDelete: "restrict", onUpdate: "restrict" }),
  type: text({ enum: ["bay", "technician"] }).notNull(),
  name: text().notNull(),
  staffId: uuid("staff_id"),
  active: boolean().default(true).notNull(),
}, (table) => [
  unique("resources_workshop_id_key").on(table.workshopId, table.id),
  unique("resources_workshop_type_name_key").on(table.workshopId, table.type, table.name),
  unique("resources_workshop_staff_key").on(table.workshopId, table.staffId),
  foreignKey({ name: "resources_workshop_staff_fk", columns: [table.workshopId, table.staffId], foreignColumns: [staff.workshopId, staff.id] }).onDelete("restrict").onUpdate("restrict"),
  check("resources_type_check", sql`${table.type} IN ('bay', 'technician')`),
  check("resources_staff_type_check", sql`${table.staffId} IS NULL OR ${table.type} = 'technician'`),
  check("resources_name_check", sql`${table.name} = btrim(${table.name}) AND length(${table.name}) > 0`),
]);
