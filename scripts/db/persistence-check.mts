import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import type { Client } from "pg";
import { admin, container } from "./local.mts";

export async function verifyPersistence(client: Client, database: string): Promise<void> {
  assert.match(database, /^bf_verify_[a-f0-9]{16}$/);
  const [workshop, otherWorkshop, emptyWorkshop, manager, adviser, technician, otherStaff, user, otherUser, missing] = Array.from({ length: 10 }, () => randomUUID());
  admin(`INSERT INTO auth.users (id) VALUES ('${user}'), ('${otherUser}');`, database);
  await client.query("BEGIN");
  try {
    await client.query("INSERT INTO app.workshops (id, name, timezone) VALUES ($1, 'Synthetic workshop', 'Europe/London'), ($2, 'Synthetic workshop', 'UTC'), ($3, 'Empty workshop', 'UTC')", [workshop, otherWorkshop, emptyWorkshop]);
    await client.query("INSERT INTO app.staff (id, workshop_id, auth_user_id, role) VALUES ($1,$5,$7,'manager'), ($2,$5,$8,'adviser'), ($3,$6,$7,'technician'), ($4,$6,$8,'technician')", [manager, adviser, technician, otherStaff, workshop, otherWorkshop, user, otherUser]);
    // Authorization role and schedulable capability are distinct; a manager may work as a technician.
    await client.query("INSERT INTO app.resources (workshop_id, type, name, staff_id) VALUES ($1,'bay','Bay 1',NULL), ($1,'technician','Technician 1',$3), ($1,'technician','Unlinked technician',NULL), ($2,'bay','Bay 1',NULL), ($2,'technician','Technician 1',$4)", [workshop, otherWorkshop, manager, technician]);
    assert.equal((await client.query("SELECT count(*)::int AS count FROM app.resources WHERE active")).rows[0].count, 5);
    assert.equal((await client.query("SELECT count(*)::int AS count FROM app.staff WHERE active")).rows[0].count, 4);

    const cases: [string, string, unknown[], string, string?][] = [
      ["missing workshop", "INSERT INTO app.staff (workshop_id,auth_user_id,role) VALUES ($1,$2,'manager')", [missing, user], "23503", "staff_workshop_id_workshops_id_fk"],
      ["missing identity", "INSERT INTO app.staff (workshop_id,auth_user_id,role) VALUES ($1,$2,'manager')", [workshop, missing], "23503", "staff_auth_user_id_users_id_fk"],
      ["duplicate membership", "INSERT INTO app.staff (workshop_id,auth_user_id,role) VALUES ($1,$2,'technician')", [workshop, user], "23505", "staff_workshop_user_key"],
      ["invalid role", "UPDATE app.staff SET role='owner' WHERE id=$1", [adviser], "23514", "staff_role_check"],
      ["null identity", "UPDATE app.staff SET auth_user_id=NULL WHERE id=$1", [manager], "23502"],
      ["null activity", "UPDATE app.staff SET active=NULL WHERE id=$1", [manager], "23502"],
      ["resource missing workshop", "INSERT INTO app.resources (workshop_id,type,name) VALUES ($1,'bay','Missing')", [missing], "23503", "resources_workshop_id_workshops_id_fk"],
      ["cross-workshop staff", "INSERT INTO app.resources (workshop_id,type,name,staff_id) VALUES ($1,'technician','Wrong workshop',$2)", [workshop, otherStaff], "23503", "resources_workshop_staff_fk"],
      ["missing staff", "INSERT INTO app.resources (workshop_id,type,name,staff_id) VALUES ($1,'technician','Missing staff',$2)", [workshop, missing], "23503", "resources_workshop_staff_fk"],
      ["bay staff link", "INSERT INTO app.resources (workshop_id,type,name,staff_id) VALUES ($1,'bay','Linked bay',$2)", [workshop, adviser], "23514", "resources_staff_type_check"],
      ["duplicate linked technician", "INSERT INTO app.resources (workshop_id,type,name,staff_id) VALUES ($1,'technician','Duplicate',$2)", [workshop, manager], "23505", "resources_workshop_staff_key"],
      ["duplicate name", "INSERT INTO app.resources (workshop_id,type,name) VALUES ($1,'bay','Bay 1')", [workshop], "23505", "resources_workshop_type_name_key"],
      ["invalid resource type", "INSERT INTO app.resources (workshop_id,type,name) VALUES ($1,'lift','Invalid')", [workshop], "23514", "resources_type_check"],
      ["blank resource name", "INSERT INTO app.resources (workshop_id,type,name) VALUES ($1,'bay','   ')", [workshop], "23514", "resources_name_check"],
      ["untrimmed resource name", "INSERT INTO app.resources (workshop_id,type,name) VALUES ($1,'bay',' Bay 2')", [workshop], "23514", "resources_name_check"],
      ["null resource type", "INSERT INTO app.resources (workshop_id,type,name) VALUES ($1,NULL,'Invalid')", [workshop], "23502"],
      ["invalid timezone", "UPDATE app.workshops SET timezone='Europe/Not_A_Place' WHERE id=$1", [workshop], "23514", "workshops_timezone_check"],
      ["timezone abbreviation", "UPDATE app.workshops SET timezone='EST' WHERE id=$1", [workshop], "23514", "workshops_timezone_check"],
      ["posix timezone", "UPDATE app.workshops SET timezone='posix/Europe/London' WHERE id=$1", [workshop], "23514", "workshops_timezone_check"],
      ["blank workshop name", "UPDATE app.workshops SET name='' WHERE id=$1", [workshop], "23514", "workshops_name_check"],
      ["referenced workshop deletion", "DELETE FROM app.workshops WHERE id=$1", [workshop], "23503"],
      ["referenced membership deletion", "DELETE FROM app.staff WHERE id=$1", [manager], "23503", "resources_workshop_staff_fk"],
      ["membership ownership change", "UPDATE app.staff SET workshop_id=$2 WHERE id=$1", [manager, emptyWorkshop], "23503", "resources_workshop_staff_fk"],
      ["resource ownership change", "UPDATE app.resources SET workshop_id=$2 WHERE staff_id=$1", [manager, emptyWorkshop], "23503", "resources_workshop_staff_fk"],
      ["linked identity change", "UPDATE app.staff SET auth_user_id=$2 WHERE id=$1", [manager, missing], "23503", "staff_auth_user_id_users_id_fk"],
    ];
    for (const [name, sql, values, code, constraint] of cases) {
      await client.query("SAVEPOINT invalid_case");
      await assert.rejects(client.query(sql, values), constraint ? { code, constraint } : { code }, name);
      await client.query("ROLLBACK TO SAVEPOINT invalid_case");
      await client.query("RELEASE SAVEPOINT invalid_case");
    }
    await client.query("UPDATE app.staff SET active=false WHERE id=$1", [manager]);
    await client.query("UPDATE app.resources SET active=false WHERE staff_id=$1", [manager]);
    assert.equal((await client.query("SELECT active FROM app.staff WHERE id=$1", [manager])).rows[0].active, false);
    assert.equal((await client.query("SELECT active FROM app.resources WHERE staff_id=$1", [manager])).rows[0].active, false);
    await client.query("COMMIT");
    // Test the provider-owned boundary as its owner, not the unprivileged application login.
    execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "supabase_admin", "-d", database, "-v", "ON_ERROR_STOP=1", "-At"], { input: `SET ROLE supabase_auth_admin; DO $$ BEGIN
      BEGIN DELETE FROM auth.users WHERE id='${user}';
        RAISE EXCEPTION 'Referenced auth identity was deleted';
      EXCEPTION WHEN foreign_key_violation THEN NULL; END;
    END $$;`, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    assert.equal(admin(`SELECT count(*) FROM auth.users WHERE id='${user}';`, database), "1");
    assert.equal((await client.query("SELECT count(*)::int AS count FROM app.resources")).rows[0].count, 5);
    console.log(`PASS: synthetic workshops/memberships/resources, defaults, deactivation/history; ${cases.length + 1} invalid relationship/value/uniqueness/deletion cases.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
