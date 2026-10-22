import { describe, expect, it } from "vitest";
import { assertLoopbackBindings, assertPreservedConfig, serializeCompose } from "./bindings.mts";

type Binding = { HostIp: string; HostPort: string };
type Container = {
  Name: string;
  State: { Running: boolean };
  Config: { Labels: Record<string, string> };
  NetworkSettings: { Ports: Record<string, Binding[] | null> };
};

const actualStyle: Container[] = [
  { Name: "/supabase_db_bayframe-local", State: { Running: true }, Config: { Labels: { "com.supabase.cli.project": "bayframe-local" } }, NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55422" }, { HostIp: "::1", HostPort: "55422" }], "5433/tcp": null } } },
  { Name: "/supabase_auth_bayframe-local", State: { Running: true }, Config: { Labels: { "com.supabase.cli.project": "bayframe-local" } }, NetworkSettings: { Ports: { "9999/tcp": null } } },
  { Name: "/supabase_rest_bayframe-local", State: { Running: true }, Config: { Labels: { "com.supabase.cli.project": "bayframe-local" } }, NetworkSettings: { Ports: { "3000/tcp": [] } } },
  { Name: "/supabase_kong_bayframe-local", State: { Running: true }, Config: { Labels: { "com.supabase.cli.project": "bayframe-local" } }, NetworkSettings: { Ports: { "8000/tcp": [{ HostIp: "127.0.0.1", HostPort: "55421" }, { HostIp: "::1", HostPort: "55421" }] } } },
];

function cloneInput(): Container[] {
  return structuredClone(actualStyle);
}

describe("assertLoopbackBindings", () => {
  it("accepts exactly the expected loopback publications and internal services", () => {
    expect(() => assertLoopbackBindings(actualStyle)).not.toThrow();
  });

  it.each([
    ["missing container", (items: Container[]) => { items.pop(); }],
    ["extra project container", (items: Container[]) => { items.push(items[0]); }],
    ["unexpected container", (items: Container[]) => { items[0].Name = "/other-service"; }],
    ["wrong project label", (items: Container[]) => { items[0].Config.Labels["com.supabase.cli.project"] = "other"; }],
    ["stopped service", (items: Container[]) => { items[1].State.Running = false; }],
    ["wildcard binding", (items: Container[]) => { items[0].NetworkSettings.Ports["5432/tcp"]![0].HostIp = "0.0.0.0"; }],
    ["IPv6 wildcard binding", (items: Container[]) => { items[3].NetworkSettings.Ports["8000/tcp"]![1].HostIp = "::"; }],
    ["empty binding address", (items: Container[]) => { items[0].NetworkSettings.Ports["5432/tcp"]![0].HostIp = ""; }],
    ["non-loopback binding", (items: Container[]) => { items[3].NetworkSettings.Ports["8000/tcp"]![0].HostIp = "192.0.2.1"; }],
    ["missing IPv6 binding", (items: Container[]) => { items[0].NetworkSettings.Ports["5432/tcp"]!.pop(); }],
    ["duplicate binding", (items: Container[]) => { items[0].NetworkSettings.Ports["5432/tcp"]![1].HostIp = "127.0.0.1"; }],
    ["wrong host port", (items: Container[]) => { items[3].NetworkSettings.Ports["8000/tcp"]![1].HostPort = "55422"; }],
    ["unexpected published port", (items: Container[]) => { items[2].NetworkSettings.Ports["3000/tcp"] = [{ HostIp: "127.0.0.1", HostPort: "3000" }]; }],
    ["malformed input", (items: Container[]) => { items[0] = null as unknown as Container; }],
  ])("rejects %s without exposing inspect values", (_case, mutate) => {
    const input = cloneInput();
    mutate(input);
    try {
      assertLoopbackBindings(input);
      throw new Error("Expected bindings to be rejected.");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Invalid local Supabase container bindings.");
    }
  });
});

describe("private service import", () => {
  const expected = { Image: "pinned", Env: ["SECRET=private", "EMPTY="], Cmd: ["sh", "-c", "echo $VALUE"], Entrypoint: null };
  it("preserves environment values regardless of ordering", () => {
    expect(() => assertPreservedConfig({ ...expected, Env: [...expected.Env].reverse() }, expected)).not.toThrow();
  });
  it.each([
    { ...expected, Env: ["SECRET=changed", "EMPTY="] },
    { ...expected, Cmd: ["sh", "-c", "echo "] },
    { ...expected, Image: "different" },
    { ...expected, Entrypoint: ["different"] },
  ])("rejects changed secrets, commands, images or entrypoints without exposing values", (actual) => {
    expect(() => assertPreservedConfig(actual, expected)).toThrowError(/^Imported local service configuration mismatch\.$/);
  });
  it("escapes shell variables, substitutions and literal dollars for Compose", () => {
    const saved = JSON.parse(serializeCompose({ command: ["$VALUE ${VALUE} $(command) $$"] })) as { command: string[] };
    expect(saved.command).toEqual(["$$VALUE $${VALUE} $$(command) $$$$"]);
  });
});
