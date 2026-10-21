import { expect, it } from "vitest";
import { localDatabase } from "./config";

it("fixes the runtime role and local endpoint despite unrelated connection variables", () => {
  expect(localDatabase({ PGHOST: "remote", PGUSER: "postgres", DATABASE_URL: "postgres://remote", BAYFRAME_RUNTIME_PASSWORD: "test" })).toEqual({
    host: "127.0.0.1", port: 55422, database: "postgres", user: "bayframe_runtime", password: "test", ssl: false,
  });
});

it("permits only the default database or a generated local verification name", () => {
  expect(localDatabase({ BAYFRAME_DATABASE: "bf_verify_0123456789abcdef" }).database).toBe("bf_verify_0123456789abcdef");
  for (const database of ["other", "template1", "postgres;drop database postgres", "bf_verify_ABCDEF0123456789", "bf_verify_0123456789abcde"]) {
    expect(() => localDatabase({ BAYFRAME_DATABASE: database })).toThrow("Invalid local verification database.");
  }
});
