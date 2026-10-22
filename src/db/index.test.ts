import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

it("handles idle pool errors without exposing connection details or crashing", async () => {
  vi.stubEnv("BAYFRAME_RUNTIME_PASSWORD", "a".repeat(64));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const { pool } = await import("./index");
  try {
    expect(() => pool.emit("error", new Error("private database credentials"))).not.toThrow();
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0])).toEqual({
      operation: "database-pool", outcome: "failed", errorClass: "database-connection", correlationId: expect.any(String),
    });
  } finally {
    await pool.end();
    log.mockRestore();
    vi.unstubAllEnvs();
  }
});
