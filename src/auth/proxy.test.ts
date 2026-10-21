import { beforeEach, expect, it, vi } from "vitest";
import type { CookieMethodsServer } from "@supabase/ssr";
import { NextRequest } from "next/server";

const { getUser, createServerClient } = vi.hoisted(() => ({ getUser: vi.fn(), createServerClient: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("./config", () => ({ authConfig: () => ({ url: "http://127.0.0.1:55421", key: "test" }), authCookieOptions: { httpOnly: true, sameSite: "lax", path: "/" } }));
import { proxy } from "../proxy";

beforeEach(() => {
  vi.resetAllMocks();
  createServerClient.mockReturnValue({ auth: { getUser } });
  getUser.mockResolvedValue({ data: { user: null }, error: null });
});

it("verifies identity before returning and prevents caching even without a session", async () => {
  const response = await proxy(new NextRequest("http://localhost:3000/staff"));
  expect(getUser).toHaveBeenCalledOnce();
  expect(response.headers.get("cache-control")).toContain("private, no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("expires")).toBe("0");
});

it("propagates refreshed cookies to the request and response, preserving multiple writes", async () => {
  const request = new NextRequest("http://localhost:3000/staff");
  getUser.mockImplementation(async () => {
    const options = createServerClient.mock.calls[0][2] as { cookies: CookieMethodsServer };
    await options.cookies.setAll?.([{ name: "auth-token", value: "refreshed", options: { httpOnly: true, sameSite: "lax" } }], { "cache-control": "private, no-store", pragma: "no-cache", expires: "0" });
    await options.cookies.setAll?.([{ name: "auth-token.1", value: "chunk", options: { httpOnly: true, sameSite: "lax" } }], {});
    return { data: { user: { id: "verified" } }, error: null };
  });
  const response = await proxy(request);
  expect(request.cookies.get("auth-token")?.value).toBe("refreshed");
  expect(response.cookies.get("auth-token")?.value).toBe("refreshed");
  expect(response.cookies.get("auth-token.1")?.value).toBe("chunk");
  expect(response.cookies.get("auth-token")?.httpOnly).toBe(true);
  expect(response.headers.get("cache-control")).toContain("no-store");
});
