import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { admin, applyMigrations, checkExposure, checkRole, connect, fail, prepareDatabase, roles } from "./local.mts";

async function verify(): Promise<void> {
  checkExposure();
  for (const role of roles) checkRole(role);
  const applicationRuntime = await connect("bayframe_runtime");
  try {
    await assert.rejects(applicationRuntime.query("SELECT * FROM auth.users LIMIT 0"), { code: "42501" });
    await assert.rejects(applicationRuntime.query("SELECT * FROM drizzle.__drizzle_migrations"), { code: "42501" });
    assert.equal((await applicationRuntime.query("SELECT has_schema_privilege(current_user, 'app', 'USAGE') AND NOT has_schema_privilege(current_user, 'app', 'CREATE') AS allowed")).rows[0].allowed, true);
  } finally {
    await applicationRuntime.end();
  }
  const database = `bf_verify_${randomBytes(8).toString("hex")}`;
  // No reset, existing-database fallback or forced disconnect. Only this run's DB is removed.
  admin(`CREATE DATABASE "${database}" TEMPLATE template0;`);
  console.log(`Created disposable database ${database}.`);
  try {
    prepareDatabase(database);
    assert.equal(admin("SELECT count(*) FROM pg_namespace WHERE nspname IN ('app', 'drizzle', 'auth');", database), "0");
    await applyMigrations(database);
    const migrator = await connect("bayframe_migrator", database);
    try {
      const journal = "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at";
      const before = (await migrator.query(journal)).rows;
      const files = readMigrationFiles({ migrationsFolder: "./drizzle" });
      assert.equal(before.length, files.length);
      assert.deepEqual(before.map((row) => row.hash), files.map((file) => file.hash));
      await applyMigrations(database);
      assert.deepEqual((await migrator.query(journal)).rows, before);
      console.log(`Migrations: ${before.length} applied; second run: 0 pending, journal unchanged.`);

      const version = (await migrator.query("SHOW server_version")).rows[0].server_version;
      const extension = (await migrator.query("SELECT e.extversion, n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE extname='btree_gist'")).rows[0];
      assert(extension, "btree_gist was not installed.");
      assert.equal(extension.nspname, "app");
      console.log(`PostgreSQL ${version}; btree_gist ${extension.extversion} installed in app.`);
      assert.equal(admin("SELECT count(*) FROM pg_tables WHERE schemaname='app';", database), "0");
      assert.equal(admin("SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='app';", database), "bayframe_migrator");
      for (const role of ["anon", "authenticated", "service_role"]) {
        assert.equal(admin(`SELECT has_schema_privilege('${role}', 'app', 'USAGE') OR has_schema_privilege('${role}', 'app', 'CREATE');`, database), "f");
      }

      // Synthetic objects exercise actual default ACLs without introducing business tables.
      await migrator.query("BEGIN");
      try {
        await migrator.query("CREATE TABLE app.privilege_probe (id integer); CREATE FUNCTION app.privilege_probe() RETURNS integer LANGUAGE sql AS 'SELECT 1'");
        assert.equal((await migrator.query("SELECT has_table_privilege('bayframe_runtime', 'app.privilege_probe', 'SELECT') AS allowed")).rows[0].allowed, false);
        assert.equal((await migrator.query("SELECT has_function_privilege('anon', 'app.privilege_probe()', 'EXECUTE') AS allowed")).rows[0].allowed, false);
      } finally {
        await migrator.query("ROLLBACK");
      }
    } finally {
      await migrator.end();
    }

    const runtime = await connect("bayframe_runtime", database);
    try {
      assert.equal((await runtime.query("SELECT current_user")).rows[0].current_user, "bayframe_runtime");
      assert.equal((await runtime.query("SELECT has_schema_privilege(current_user, 'app', 'USAGE') AS allowed")).rows[0].allowed, true);
      for (const statement of [
        "CREATE SCHEMA forbidden", "CREATE TABLE app.forbidden (id integer)",
        "CREATE TABLE public.forbidden (id integer)", "CREATE TEMP TABLE forbidden (id integer)",
        "SET ROLE bayframe_migrator", "SELECT * FROM drizzle.__drizzle_migrations",
      ]) {
        await assert.rejects(runtime.query(statement), { code: "42501" }, `Runtime unexpectedly allowed: ${statement}`);
      }
    } finally {
      await runtime.end();
    }
    console.log("PASS: non-exposed app schema, API-role denial, runtime login/DDL/role/journal denial, default ACLs; no business tables.");
  } finally {
    admin(`DROP DATABASE "${database}";`);
    console.log(`Removed disposable database ${database}.`);
  }
}

verify().catch(fail);
