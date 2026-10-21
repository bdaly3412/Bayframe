import { beforeEach, expect, test, vi } from "vitest";

const { signIn, createClient, redirect } = vi.hoisted(() => ({
  signIn: vi.fn(), createClient: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/auth/server", () => ({ createAuthClient: createClient }));
vi.mock("next/navigation", () => ({ redirect }));
import { login } from "./actions";

function form(email = "staff@example.test", password = "synthetic-password") {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  createClient.mockResolvedValue({ auth: { signInWithPassword: signIn } });
  signIn.mockResolvedValue({ error: null });
  redirect.mockImplementation(() => { throw new Error("redirect"); });
});
test("rejects invalid credentials before contacting authentication", async () => {
  expect(await login("", form("invalid"))).toContain("Check your credentials");
  expect(createClient).not.toHaveBeenCalled();
});
test("returns a recoverable generic error without redirect or credential disclosure", async () => {
  signIn.mockResolvedValue({ error: { message: "private authentication detail" } });
  const result = await login("", form());
  expect(result).toBe("Sign in failed. Check your credentials and try again.");
  expect(redirect).not.toHaveBeenCalled();
});
test("handles unavailable authentication without leaking infrastructure details", async () => {
  createClient.mockRejectedValue(new Error("private infrastructure detail"));
  expect(await login("", form())).toBe("Sign in is unavailable. Your email is preserved. Try again.");
});
test("redirects to staff only after authentication succeeds", async () => {
  await expect(login("", form())).rejects.toThrow("redirect");
  expect(signIn).toHaveBeenCalledWith({ email: "staff@example.test", password: "synthetic-password" });
  expect(redirect).toHaveBeenCalledWith("/staff");
});
