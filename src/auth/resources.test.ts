import { beforeEach, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

vi.mock("server-only", () => ({}));
const { requireStaff, select, where, orderBy } = vi.hoisted(() => ({ requireStaff: vi.fn(), select: vi.fn(), where: vi.fn(), orderBy: vi.fn() }));
vi.mock("./access", () => ({ requireStaff }));
vi.mock("@/db", () => ({ db: { select } }));
import { listResources } from "./resources";

beforeEach(() => {
  vi.resetAllMocks();
  const query = { from: vi.fn().mockReturnThis(), where, orderBy };
  select.mockReturnValue(query);
  where.mockReturnValue(query);
  orderBy.mockResolvedValue([]);
});

it("does not touch resources after a denied membership check", async () => {
  requireStaff.mockRejectedValue(new Error("Access denied"));
  await expect(listResources("workshop")).rejects.toThrow("Access denied");
  expect(select).not.toHaveBeenCalled();
});

it("scopes the resource query to the authorized workshop and selects no staff identity", async () => {
  requireStaff.mockResolvedValue({ role: "manager" });
  await expect(listResources("workshop")).resolves.toEqual([]);
  expect(requireStaff).toHaveBeenCalledWith("workshop");
  const sql = new PgDialect().sqlToQuery(where.mock.calls[0][0] as SQL);
  expect(sql.sql).toContain('"resources"."workshop_id"');
  expect(sql.params).toEqual(["workshop"]);
  expect(Object.keys(select.mock.calls[0][0])).toEqual(["id", "name", "type", "active"]);
});
