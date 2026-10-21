import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { storedCookies } = vi.hoisted(() => ({ storedCookies: new Map<string, string>() }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  getAll: () => [...storedCookies].map(([name, value]) => ({ name, value })),
  set: (name: string, value: string) => { storedCookies.set(name, value); },
}) }));

import { createAuthClient } from "./server";
import { getStaffMemberships, requireStaff } from "./access";
import { listResources } from "./resources";
import { pool } from "@/db";

const workshop = "baf00000-0000-4000-8000-000000000001";

describe.skipIf(process.env.BAYFRAME_LIVE_TESTS !== "1")("actual local authentication and runtime database authorization", () => {
  const credentials = () => JSON.parse(readFileSync("output/demo-credentials.txt", "utf8")) as Record<string, { email: string; password: string }>;
  async function signIn(role: string) {
    const client = await createAuthClient();
    const { error } = await client.auth.signInWithPassword(credentials()[role]);
    expect(error?.name ?? null).toBeNull();
  }
  beforeEach(() => storedCookies.clear());
  afterAll(() => pool.end());

  it("denies anonymous protected access", async () => {
    await expect(listResources(workshop)).rejects.toMatchObject({ status: 401 });
  });

  it("denies public signup while preserving password sign-in", async () => {
    const client = await createAuthClient();
    const { error } = await client.auth.signUp({ email: "blocked-signup@example.test", password: "Synthetic-test-password-12345" });
    expect(error?.code).toBe("signup_disabled");
  });

  it.each(["inactive", "nonstaff", "technician"])("denies %s resource access", async (role) => {
    await signIn(role);
    await expect(listResources(workshop)).rejects.toMatchObject({ status: 403 });
  });

  it("denies another workshop for an authenticated manager", async () => {
    await signIn("manager");
    await expect(listResources("baf00000-0000-4000-8000-000000000099")).rejects.toMatchObject({ status: 403 });
  });

  it.each(["manager", "adviser"])("allows scoped %s resources", async (role) => {
    await signIn(role);
    const rows = await listResources(workshop);
    expect(rows.map((row) => row.name)).toEqual(["Bay 1", "Bay 2", "Demo technician"]);
    expect(rows.every((row) => Object.keys(row).sort().join(",") === "active,id,name,type")).toBe(true);
  });

  it("keeps technician permission explicit", async () => {
    await signIn("technician");
    await expect(requireStaff(workshop, ["technician"])).resolves.toMatchObject({ role: "technician", workshopId: workshop });
    await expect(getStaffMemberships()).resolves.toHaveLength(1);
  });

  it("does not return inactive memberships", async () => {
    await signIn("inactive");
    await expect(getStaffMemberships()).resolves.toEqual([]);
  });

  it("ends the local session and denies subsequent reads", async () => {
    await signIn("manager");
    const client = await createAuthClient();
    const { error } = await client.auth.signOut({ scope: "local" });
    expect(error).toBeNull();
    await expect(listResources(workshop)).rejects.toMatchObject({ status: 401 });
  });
});
