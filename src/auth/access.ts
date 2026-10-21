import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { staff, workshops } from "../../scripts/db/schema";
import { createAuthClient } from "./server";

export type StaffRole = "manager" | "adviser" | "technician";
export type StaffMembership = { id: string; workshopId: string; authUserId: string; role: StaffRole };

export class StaffAccessError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Sign in required." : "Access denied.");
    this.name = "StaffAccessError";
  }
}

async function verifiedUserId() {
  const client = await createAuthClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new StaffAccessError(401);
  return data.user.id;
}

export async function getStaffMemberships() {
  const authUserId = await verifiedUserId();
  return db.select({
    id: staff.id, workshopId: staff.workshopId, authUserId: staff.authUserId,
    role: staff.role, workshopName: workshops.name, timezone: workshops.timezone,
  }).from(staff).innerJoin(workshops, eq(staff.workshopId, workshops.id))
    .where(and(eq(staff.authUserId, authUserId), eq(staff.active, true)))
    .orderBy(workshops.name);
}

export async function requireStaff(workshopId: string, roles: readonly StaffRole[] = ["manager", "adviser"]): Promise<StaffMembership> {
  const authUserId = await verifiedUserId();
  if (!z.uuid().safeParse(workshopId).success) throw new StaffAccessError(403);
  const [member] = await db.select({
    id: staff.id, workshopId: staff.workshopId, authUserId: staff.authUserId, role: staff.role,
  }).from(staff).where(and(
    eq(staff.authUserId, authUserId), eq(staff.workshopId, workshopId), eq(staff.active, true),
  )).limit(1);
  if (!member || !roles.includes(member.role)) throw new StaffAccessError(403);
  return member;
}

export async function requireStaffPage(workshopId: string, roles?: readonly StaffRole[]) {
  try {
    return await requireStaff(workshopId, roles);
  } catch (error) {
    if (error instanceof StaffAccessError) redirect(error.status === 401 ? "/login" : "/staff?denied=1");
    throw error;
  }
}
