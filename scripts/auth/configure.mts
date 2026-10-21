import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

try {
  const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "pnpm exec supabase status -o json"] : ["exec", "supabase", "status", "-o", "json"];
  const status = JSON.parse(execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })) as Record<string, string>;
  assert.equal(status.API_URL, "http://127.0.0.1:55421");
  const values = { SUPABASE_URL: status.API_URL, SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY };
  let content = readFileSync(".env.local", "utf8");
  for (const [name, value] of Object.entries(values)) {
    assert(typeof value === "string" && value.length > 0 && !/[\r\n]/.test(value));
    const existing = content.match(new RegExp(`^${name}=(.*)$`, "m"));
    if (existing) assert.equal(existing[1].trim(), value);
    else content += `\n${name}=${value}`;
  }
  writeFileSync(".env.local", content + "\n", { mode: 0o600 });
  console.log("Local authentication configuration saved; existing matching values preserved.");
} catch {
  console.error("Local authentication configuration failed. Check project services and existing configuration; no credentials were replaced.");
  process.exitCode = 1;
}
