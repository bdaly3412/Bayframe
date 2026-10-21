import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

vi.mock("server-only", () => ({}));
const { getUser, select, where, limit, orderBy } = vi.hoisted(() => ({
  getUser: vi.fn(), select: vi.fn(), where: vi.fn(), limit: vi.fn(), orderBy: vi.fn(),
}));
vi.mock("./server", () => ({ createAuthClient: async () => ({ auth: { getUser } }) }));
vi.mock("@/db", () => ({ db: { select } }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { getStaffMemberships, requireStaff, StaffAccessError } from "./access";

const workshop = "baf00000-0000-4000-8000-000000000001";
const identity = "baf00000-0000-4000-8000-000000000002";
const member = { id: "staff-id", workshopId: workshop, authUserId: identity, role: "manager" };

beforeEach(() => {
  vi.resetAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: identity } }, error: null });
  const query = { from: vi.fn().mockReturnThis(), innerJoin: vi.fn().mockReturnThis(), where, limit, orderBy };
  select.mockReturnValue(query);
  where.mockReturnValue(query);
  limit.mockResolvedValue([member]);
  orderBy.mockResolvedValue([{ ...member, workshopName: "Demo", timezone: "Europe/London" }]);
});

describe("protected staff membership boundary", () => {
  it("denies anonymous access before querying business data", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireStaff(workshop)).rejects.toMatchObject({ status: 401 });
    expect(select).not.toHaveBeenCalled();
  });

  it("denies a rejected identity even when a user object exists", async () => {
    getUser.mockResolvedValue({ data: { user: { id: identity } }, error: new Error("expired") });
    await expect(requireStaff(workshop)).rejects.toMatchObject({ status: 401 });
    expect(select).not.toHaveBeenCalled();
  });

  it.each(["nonstaff", "inactive", "wrong-workshop"])("denies %s when no current scoped membership exists", async () => {
    limit.mockResolvedValue([]);
    await expect(requireStaff(workshop)).rejects.toBeInstanceOf(StaffAccessError);
    const sql = new PgDialect().sqlToQuery(where.mock.calls[0][0] as SQL);
    expect(sql.sql).toContain('"staff"."auth_user_id"');
    expect(sql.sql).toContain('"staff"."workshop_id"');
    expect(sql.sql).toContain('"staff"."active"');
    expect(sql.params).toEqual([identity, workshop, true]);
  });

  it("rejects an invalid workshop identifier", async () => {
    await expect(requireStaff("not-a-uuid")).rejects.toMatchObject({ status: 403 });
    expect(select).not.toHaveBeenCalled();
  });

  it("denies technician access to manager/adviser reads", async () => {
    limit.mockResolvedValue([{ ...member, role: "technician" }]);
    await expect(requireStaff(workshop)).rejects.toMatchObject({ status: 403 });
  });

  it.each(["manager", "adviser"])("allows current %s membership", async (role) => {
    limit.mockResolvedValue([{ ...member, role }]);
    await expect(requireStaff(workshop)).resolves.toEqual({ ...member, role });
  });

  it("supports an explicit minimal technician permission and denies empty permissions", async () => {
    limit.mockResolvedValue([{ ...member, role: "technician" }]);
    await expect(requireStaff(workshop, ["technician"])).resolves.toMatchObject({ role: "technician" });
    await expect(requireStaff(workshop, [])).rejects.toMatchObject({ status: 403 });
  });

  it("rechecks membership for every operation rather than caching active status", async () => {
    await requireStaff(workshop);
    limit.mockResolvedValue([]);
    await expect(requireStaff(workshop)).rejects.toMatchObject({ status: 403 });
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it("lists only current identity active memberships", async () => {
    await expect(getStaffMemberships()).resolves.toHaveLength(1);
    const sql = new PgDialect().sqlToQuery(where.mock.calls[0][0] as SQL);
    expect(sql.params).toEqual([identity, true]);
  });
});
