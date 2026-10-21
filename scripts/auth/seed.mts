import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { connect, fail } from "../db/local.mts";

export const demoWorkshopId = "baf00000-0000-4000-8000-000000000001";
const credentialsPath = "output/demo-credentials.txt";
const accounts = ["manager", "adviser", "technician", "inactive", "nonstaff"] as const;

async function main() {
  assert.equal(process.env.SUPABASE_URL ?? "http://127.0.0.1:55421", "http://127.0.0.1:55421");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(key, "Missing local auth administration key.");
  const client = createClient("http://127.0.0.1:55421", key, { auth: { persistSession: false, autoRefreshToken: false } });
  const existing = existsSync(credentialsPath) ? JSON.parse(readFileSync(credentialsPath, "utf8")) as Record<string, { email: string; password: string }> : {};
  const credentials: Record<string, { email: string; password: string }> = {};
  const identities: Record<string, string> = {};
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert(!error, "Could not inspect local demo identities.");
  for (const role of accounts) {
    const email = `demo.${role}@example.test`;
    const password = existing[role]?.password ?? randomBytes(24).toString("base64url");
    const user = data.users.find((entry) => entry.email === email);
    if (user) {
      if (!existing[role]) {
        const updated = await client.auth.admin.updateUserById(user.id, { password });
        assert(!updated.error, "Could not restore local demo credentials.");
      }
      identities[role] = user.id;
    } else {
      const created = await client.auth.admin.createUser({ email, password, email_confirm: true });
      assert(!created.error && created.data.user, "Could not create local demo identity.");
      identities[role] = created.data.user.id;
    }
    credentials[role] = { email, password };
  }
  const database = await connect("bayframe_migrator");
  try {
    await database.query("BEGIN");
    await database.query("INSERT INTO app.workshops (id,name,timezone) VALUES ($1,'Bayframe demonstration workshop','Europe/London') ON CONFLICT (id) DO NOTHING", [demoWorkshopId]);
    const otherWorkshop = "baf00000-0000-4000-8000-000000000099";
    await database.query("INSERT INTO app.workshops (id,name,timezone) VALUES ($1,'Separate demonstration workshop','Europe/London') ON CONFLICT (id) DO NOTHING", [otherWorkshop]);
    await database.query("INSERT INTO app.resources (workshop_id,type,name) VALUES ($1,'bay','Restricted fixture bay') ON CONFLICT (workshop_id,type,name) DO NOTHING", [otherWorkshop]);
    for (const role of ["manager", "adviser", "technician", "inactive"] as const) {
      await database.query("INSERT INTO app.staff (workshop_id,auth_user_id,role,active) VALUES ($1,$2,$3,$4) ON CONFLICT (workshop_id,auth_user_id) DO NOTHING", [demoWorkshopId, identities[role], role === "inactive" ? "adviser" : role, role !== "inactive"]);
    }
    for (const name of ["Bay 1", "Bay 2"]) {
      await database.query("INSERT INTO app.resources (workshop_id,type,name) VALUES ($1,'bay',$2) ON CONFLICT (workshop_id,type,name) DO NOTHING", [demoWorkshopId, name]);
    }
    await database.query("INSERT INTO app.resources (workshop_id,type,name,staff_id) SELECT $1,'technician','Demo technician',id FROM app.staff WHERE workshop_id=$1 AND auth_user_id=$2 ON CONFLICT (workshop_id,type,name) DO NOTHING", [demoWorkshopId, identities.technician]);
    await database.query("COMMIT");
  } catch (error) {
    await database.query("ROLLBACK");
    throw error;
  } finally {
    await database.end();
  }
  mkdirSync("output", { recursive: true });
  writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + "\n", { mode: 0o600 });
  if (!/^BAYFRAME_WORKSHOP_ID=/m.test(readFileSync(".env.local", "utf8"))) {
    appendFileSync(".env.local", `\nBAYFRAME_WORKSHOP_ID=${demoWorkshopId}\n`);
  }
  console.log("Synthetic local accounts and workshop ready. Credentials are in ignored output/demo-credentials.txt.");
}

main().catch(fail);
