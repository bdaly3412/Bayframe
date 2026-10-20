import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export const container = "supabase_db_bayframe-local";
export const roles = ["bayframe_migrator", "bayframe_runtime"] as const;
export type Role = (typeof roles)[number];

export function password(role: Role): string {
  const value = process.env[`${role.toUpperCase()}_PASSWORD`];
  assert(value && /^[a-f0-9]{64}$/.test(value), `Missing/invalid local password for ${role}; run db:setup.`);
  return value;
}

// The fixed container and endpoint prevent environment variables redirecting local checks.
export function admin(sql: string, database = "postgres"): string {
  assert(database === "postgres" || /^bf_verify_[a-f0-9]{16}$/.test(database));
  const labels = JSON.parse(execFileSync("docker", ["inspect", "--format", "{{json .Config.Labels}}", container], { encoding: "utf8" })) as Record<string, string>;
  assert.equal(labels["com.supabase.cli.project"], "bayframe-local", "Unexpected local project container.");
  return execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-At"], {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

export async function connect(role: Role, database = "postgres"): Promise<Client> {
  const client = new Client({
    host: "127.0.0.1", port: 55422, database, user: role,
    password: password(role), ssl: false,
    connectionTimeoutMillis: 5000, statement_timeout: 10000,
  });
  await client.connect();
  return client;
}

export function prepareDatabase(database: string): void {
  admin(`
    REVOKE CREATE, TEMPORARY ON DATABASE "${database}" FROM PUBLIC;
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    GRANT CONNECT, CREATE ON DATABASE "${database}" TO bayframe_migrator;
    GRANT CONNECT ON DATABASE "${database}" TO bayframe_runtime;
  `, database);
}

export function checkRole(role: Role): void {
  assert.equal(admin(`SELECT NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication OR rolbypassrls) AND rolcanlogin FROM pg_roles WHERE rolname = '${role}';`), "t", `Unsafe existing role ${role}.`);
  assert.equal(admin(`SELECT count(*) FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member WHERE r.rolname = '${role}';`), "0", `Unexpected memberships for ${role}.`);
}

export async function applyMigrations(database = "postgres"): Promise<void> {
  const client = await connect("bayframe_migrator", database);
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  } finally {
    await client.end();
  }
}

export function checkExposure(): void {
  const config = readFileSync("supabase/config.toml", "utf8");
  assert.match(config, /^schemas = \["public", "graphql_public"\]$/m);
  const exposed = execFileSync("docker", ["inspect", "--format", "{{json .Config.Env}}", "supabase_rest_bayframe-local"], { encoding: "utf8" });
  const environment = JSON.parse(exposed) as string[];
  assert.equal(environment.find((entry) => entry.startsWith("PGRST_DB_SCHEMAS=")), "PGRST_DB_SCHEMAS=public,graphql_public");
  assert.equal(admin("SELECT to_regclass('auth.users') IS NOT NULL;"), "t", "Supabase auth platform is missing.");
}

export function fail(error: unknown): void {
  // Database errors may contain credentials or full SQL: print only safe codes.
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
  console.error(`Local database check failed (${code}).`);
  if (error instanceof assert.AssertionError) console.error(error.message);
  process.exitCode = 1;
}
