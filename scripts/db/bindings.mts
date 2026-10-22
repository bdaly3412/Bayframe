import assert from "node:assert/strict";

type JsonObject = Record<string, unknown>;

export type PreservedConfig = { Image: string; Env: string[]; Entrypoint: string[] | null; Cmd: string[] | null };

export function assertPreservedConfig(actual: PreservedConfig, expected: PreservedConfig): void {
  try {
    assert.deepEqual(actual.Env.toSorted(), expected.Env.toSorted());
    assert.deepEqual(actual.Cmd, expected.Cmd);
    assert.deepEqual(actual.Entrypoint, expected.Entrypoint);
    assert.equal(actual.Image, expected.Image);
  } catch {
    throw new Error("Imported local service configuration mismatch.");
  }
}

export function serializeCompose(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => typeof item === "string" ? item.replaceAll("$", () => "$$") : item, 2);
}

const projectLabel = "com.supabase.cli.project";
const expected = {
  "supabase_db_bayframe-local": { port: "5432/tcp", hostPort: "55422" },
  "supabase_auth_bayframe-local": null,
  "supabase_rest_bayframe-local": null,
  "supabase_kong_bayframe-local": { port: "8000/tcp", hostPort: "55421" },
} as const;

function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalid(): never {
  throw new Error("Invalid local Supabase container bindings.");
}

export function assertLoopbackBindings(containers: unknown): void {
  if (!Array.isArray(containers) || containers.length !== 4) invalid();

  const seen = new Set<string>();
  for (const value of containers) {
    if (!object(value) || typeof value.Name !== "string" || !value.Name.startsWith("/")) invalid();
    const name = value.Name.slice(1);
    if (!Object.hasOwn(expected, name) || seen.has(name)) invalid();
    seen.add(name);

    if (!object(value.State) || value.State.Running !== true) invalid();
    if (!object(value.Config) || !object(value.Config.Labels) || value.Config.Labels[projectLabel] !== "bayframe-local") invalid();
    if (!object(value.NetworkSettings) || !object(value.NetworkSettings.Ports)) invalid();

    const required = expected[name as keyof typeof expected];
    let requiredBindings: unknown;
    for (const [port, bindings] of Object.entries(value.NetworkSettings.Ports)) {
      if (bindings === null || (Array.isArray(bindings) && bindings.length === 0)) continue;
      if (!Array.isArray(bindings)) invalid();
      if (!required || port !== required.port) invalid();
      requiredBindings = bindings;
    }

    if (!required) continue;
    if (!Array.isArray(requiredBindings) || requiredBindings.length !== 2) invalid();
    const targets = new Set<string>();
    for (const binding of requiredBindings) {
      if (!object(binding) || typeof binding.HostIp !== "string" || typeof binding.HostPort !== "string") invalid();
      targets.add(`${binding.HostIp}:${binding.HostPort}`);
    }
    if (targets.size !== 2 || !targets.has(`127.0.0.1:${required.hostPort}`) || !targets.has(`::1:${required.hostPort}`)) invalid();
  }
}
