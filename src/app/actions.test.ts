import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { requireStaff, services, revalidatePath } = vi.hoisted(() => ({
  requireStaff: vi.fn(), revalidatePath: vi.fn(),
  services: {
    addTask: vi.fn(), allocate: vi.fn(), availability: vi.fn(), cancelBooking: vi.fn(),
    checkIn: vi.fn(), createEstimate: vi.fn(), createRequest: vi.fn(), decideEstimate: vi.fn(),
    issueEstimate: vi.fn(), previewDecision: vi.fn(), recordAbsence: vi.fn(), updateWork: vi.fn(),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/auth/access", () => ({
  requireStaff,
  StaffAccessError: class extends Error {
    constructor(public readonly status: 401 | 403) { super(status === 401 ? "Sign in required." : "Access denied."); }
  },
}));
vi.mock("@/workshop/service", () => services);
import { StaffAccessError } from "@/auth/access";
import { requestInput, WorkflowError } from "@/workshop/rules";
import { readDecision, runAction, submitDecision } from "./actions";

const workshopId = "baf00000-0000-4000-8000-000000000001";
const id = "baf00000-0000-4000-8000-000000000002";
const actor = { id, workshopId, authUserId: "baf00000-0000-4000-8000-000000000003", role: "adviser" };
const token = "a".repeat(64);
const genericError = "The operation failed. Refresh the page and try again. No success is confirmed.";
const operatorCommands = ["confirm", "reschedule", "cancel", "reject", "check-in", "add-task", "close", "draft", "issue"];
const protectedCommands = [
  ...operatorCommands.map((command) => ({ command, roles: ["manager", "adviser"] })),
  ...["start", "complete", "task"].map((command) => ({ command, roles: ["manager", "adviser", "technician"] })),
  { command: "absence", roles: ["manager"] },
];
function form(command: string, values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [name, value] of Object.entries({ command, workshopId, id, ...values })) data.set(name, value);
  return data;
}
function expectNoServices() {
  for (const service of Object.values(services)) expect(service).not.toHaveBeenCalled();
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  requireStaff.mockResolvedValue(actor);
});
afterEach(() => vi.restoreAllMocks());

test.each([form("change-role"), form("confirm", { workshopId: "forged" })])("rejects malformed command/workshop before authorization", async (data) => {
  expect(await runAction(data)).toMatchObject({ success: false });
  expect(requireStaff).not.toHaveBeenCalled();
  expectNoServices();
  expect(revalidatePath).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
});

test.each(protectedCommands)("authorizes $command with its exact workshop/roles before any mutation", async ({ command, roles }) => {
  for (const status of [401, 403] as const) {
    requireStaff.mockRejectedValue(new StaffAccessError(status));
    const result = await runAction(form(command, { role: "manager", authUserId: "forged", staffId: "forged" }));
    expect(result).toEqual({ success: false, message: status === 401 ? "Sign in required." : "Access denied." });
    expect(requireStaff).toHaveBeenLastCalledWith(workshopId, roles);
    expectNoServices();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  }
});

test("passes the verified actor instead of browser-supplied identity or role", async () => {
  const result = await runAction(form("cancel", { role: "manager", authUserId: "forged", staffId: "forged" }));
  expect(result).toEqual({ success: true, message: "Saved." });
  expect(services.cancelBooking).toHaveBeenCalledWith(actor, id, false);
  expect(revalidatePath).toHaveBeenCalledWith("/staff/schedule");
});

test("rejects an invalid record identifier after authorization without calling a service", async () => {
  expect(await runAction(form("cancel", { id: "invalid" }))).toMatchObject({ success: false });
  expectNoServices();
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("keeps public requests unauthenticated and forwards only request fields", async () => {
  const input = { name: "Synthetic contact", email: "fixture@example.test", registration: "DEMO", startAt: "2030-01-07T09:00:00Z" };
  services.createRequest.mockResolvedValue(id);
  const result = await runAction(form("request", { ...input, role: "manager" }));
  expect(result).toMatchObject({ success: true });
  expect(result.message).toContain(id);
  expect(services.createRequest).toHaveBeenCalledWith({ workshopId, ...input });
  expect(requireStaff).not.toHaveBeenCalled();
});

test("keeps advisory availability unauthenticated without reserving resources", async () => {
  services.availability.mockResolvedValue({ bays: 1, technicians: 2 });
  const result = await runAction(form("availability", { startAt: "2030-01-07T09:00:00Z" }));
  expect(result).toEqual({ success: true, message: "1 bay(s) and 2 technician(s) currently available. This is advisory, not a reservation." });
  expect(services.availability).toHaveBeenCalledWith(workshopId, "2030-01-07T09:00:00Z");
  expect(requireStaff).not.toHaveBeenCalled();
  expect(services.allocate).not.toHaveBeenCalled();
});

test("returns validation field names from the request schema without logging input", async () => {
  services.createRequest.mockImplementation((input) => requestInput.parse(input));
  const result = await runAction(form("request", { name: "", email: "private-invalid-email", registration: "DEMO", startAt: "invalid" }));
  expect(result.success).toBe(false);
  expect(result.fields).toEqual(["name", "email", "startAt"]);
  expect(result.message).not.toContain("private-invalid-email");
  expect(console.error).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
});

test.each(["-1.00", "1.001", "1e3"])("rejects malformed estimate price %s before creating an estimate", async (price) => {
  expect(await runAction(form("draft", { quantity: "1", price, description: "Synthetic work" }))).toMatchObject({ success: false });
  expect(services.createEstimate).not.toHaveBeenCalled();
});

test("returns controlled invalid capability and conflicting decision errors", async () => {
  services.previewDecision.mockRejectedValue(new WorkflowError("Decision link is invalid or unavailable."));
  expect(await readDecision("invalid")).toEqual({ error: "Decision link is invalid or unavailable." });
  expect(services.previewDecision).toHaveBeenCalledWith("invalid");
  services.decideEstimate.mockRejectedValue(new WorkflowError("A different decision has already been recorded."));
  expect(await submitDecision(token, "rejected")).toEqual({ success: false, message: "A different decision has already been recorded." });
  expect(services.decideEstimate).toHaveBeenCalledWith(token, "rejected");
  expect(requireStaff).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
});

test("maps repeated customer decisions to an explicit idempotent response", async () => {
  services.decideEstimate.mockResolvedValue("already-recorded");
  expect(await submitDecision(token, "accepted")).toEqual({ success: true, message: "This decision was already recorded." });
  expect(revalidatePath).toHaveBeenCalledWith("/staff/schedule");
});

test.each([
  { code: "23505", errorClass: "database-conflict" },
  { code: "57014", errorClass: "database-timeout" },
  { code: "08006", errorClass: "database-connection" },
  { code: "private-code", errorClass: "unexpected" },
])("logs only safe classification for $errorClass", async ({ code, errorClass }) => {
  const secret = `SELECT * FROM auth.users; contact=private@example.test token=${token}`;
  const failure = new Error(secret, { cause: Object.assign(new Error(secret), { code, detail: secret, query: secret }) });
  services.cancelBooking.mockRejectedValue(failure);
  expect(await runAction(form("cancel"))).toEqual({ success: false, message: genericError });
  services.previewDecision.mockRejectedValue(failure);
  expect(await readDecision(token)).toEqual({ error: genericError });
  services.decideEstimate.mockRejectedValue(failure);
  expect(await submitDecision(token, "accepted")).toEqual({ success: false, message: genericError });
  const calls = vi.mocked(console.error).mock.calls;
  expect(calls).toHaveLength(3);
  for (const [index, args] of calls.entries()) {
    expect(args).toHaveLength(1);
    const logged = JSON.parse(args[0] as string);
    expect(logged).toEqual({ operation: ["cancel", "decision-preview", "customer-decision"][index], outcome: "failed", correlationId: expect.any(String), errorClass });
    expect(logged.correlationId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    expect(args[0]).not.toContain(secret);
    expect(args[0]).not.toContain(token);
  }
  expect(revalidatePath).not.toHaveBeenCalled();
});
