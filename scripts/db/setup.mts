import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { admin, checkExposure, checkRole, connect, fail, password, prepareAuthReference, prepareDatabase, roles } from "./local.mts";

async function setup(): Promise<void> {
  checkExposure();
  if (!existsSync(".env.local")) {
    writeFileSync(".env.local", roles.map((role) => `${role.toUpperCase()}_PASSWORD=${randomBytes(32).toString("hex")}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
  }
  loadEnvFile(".env.local");
  for (const role of roles) {
    const existing = admin(`SELECT count(*) FROM pg_roles WHERE rolname = '${role}';`);
    if (existing === "0") {
      admin(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${password(role)}';`);
    }
    checkRole(role);
  }
  prepareDatabase("postgres");
  prepareAuthReference();
  for (const role of roles) {
    const client = await connect(role);
    await client.end();
  }
  console.log("Local roles ready; existing passwords/data preserved. Credentials stay in .env.local.");
}

setup().catch(fail);
