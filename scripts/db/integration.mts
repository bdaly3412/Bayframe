import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { admin, applyMigrations, container, prepareAuthReference, prepareDatabase } from "./local.mts";

async function runVitest(environment: NodeJS.ProcessEnv): Promise<void> {
  const child = spawn(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.integration.config.ts"], { stdio: "inherit", env: environment });
  const result = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  assert.equal(result.code, 0, `Integration tests exited with ${result.signal ?? result.code}.`);
}

async function verify(): Promise<void> {
  const database = `bf_verify_${randomBytes(8).toString("hex")}`;
  const workshopId = randomUUID();
  // Never reuse or force-drop a database. This name is checked by local admin().
  admin(`CREATE DATABASE "${database}" TEMPLATE template0;`);
  console.log(`Created disposable database ${database}.`);
  try {
    prepareDatabase(database);
    assert.equal(admin("SELECT count(*) FROM pg_namespace WHERE nspname IN ('app','drizzle','auth');", database), "0");
    const authSchema = execFileSync("docker", ["exec", container, "pg_dump", "-U", "postgres", "-d", "postgres", "--schema=auth", "--schema-only"], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "supabase_admin", "-d", database, "-v", "ON_ERROR_STOP=1", "-At"], {
      input: authSchema, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
    });
    prepareAuthReference(database);
    await applyMigrations(database);
    console.log("Restored auth schema only and applied application migrations.");
    await runVitest({ ...process.env, BAYFRAME_DATABASE: database, BAYFRAME_WORKSHOP_ID: workshopId });
  } finally {
    assert.equal(admin(`SELECT count(*) FROM pg_stat_activity WHERE datname='${database}';`), "0", "Test connections remain open; database preserved for safe cleanup.");
    admin(`DROP DATABASE "${database}";`);
    console.log(`Removed disposable database ${database}.`);
  }
}

verify().catch((error: unknown) => {
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : error;
  const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "unknown";
  console.error(`Workflow integration verification failed (${code}).`);
  if (error instanceof assert.AssertionError) console.error(error.message);
  process.exitCode = 1;
});
