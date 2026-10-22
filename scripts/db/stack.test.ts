import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ calls: [] as string[][], writes: [] as string[], wrongImage: false, failedUp: false, partial: false, changedFile: false }));
const services = ["db", "auth", "rest", "kong"];
const source = { Image: "pinned", Env: ["SECRET=preserved"], Cmd: [], Entrypoint: [] };

vi.mock("node:fs", () => ({
  existsSync: (path: string) => !state.partial || path.endsWith("db.env"),
  mkdirSync: vi.fn(),
  writeFileSync: (path: string) => { state.writes.push(path); },
  readFileSync: () => state.partial ? `SECRET=${state.changedFile ? "changed" : "preserved"}\n` : JSON.stringify(Object.fromEntries(services.map((service) => [service, source]))),
}));
vi.mock("node:child_process", () => ({
  execFileSync: (_command: string, args: string[]) => {
    state.calls.push(args);
    if (state.partial) {
      if (args[0] === "volume") return "supabase_db_bayframe-local";
      if (args[0] === "network") return "supabase_network_bayframe-local";
      const format = args.at(-1)!;
      if (format.includes(".Config")) return JSON.stringify({ ...source, Labels: { "com.supabase.cli.project": "bayframe-local" } });
      if (format.includes(".State.Running")) return "true";
      if (format.includes(".Mounts")) return JSON.stringify([{ Type: "volume", Name: "supabase_db_bayframe-local", Destination: "/var/lib/postgresql/data" }]);
      throw new Error("Synthetic later import inspection failure");
    }
    if (args[0] === "compose") {
      if (args.includes("config")) return JSON.stringify({ services: Object.fromEntries(services.map((service) => [service, { image: state.wrongImage ? "changed" : "pinned", environment: { SECRET: "preserved" }, command: [], entrypoint: [] }])) });
      if (args.includes("up") && state.failedUp) throw new Error("Synthetic startup failure");
      return "";
    }
    if (args[0] === "ps") return services.map((service) => `supabase_${service}_bayframe-local`).join("\n");
    if (args[0] === "inspect") {
      const name = args.at(-1)!;
      return JSON.stringify({ Name: `/${name}`, State: { Running: true }, Config: { Labels: { "com.supabase.cli.project": "bayframe-local" } }, NetworkSettings: { Ports: name.includes("_db_") ? { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "55422" }] } : {} } });
    }
    throw new Error("Unexpected external operation in startup test");
  },
}));

const previousArgv = process.argv;
const previousExitCode = process.exitCode;
beforeEach(() => {
  vi.resetModules();
  state.calls = [];
  state.writes = [];
  state.wrongImage = false;
  state.failedUp = false;
  state.partial = false;
  state.changedFile = false;
  process.argv = ["node", "stack.mts", "start"];
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  process.argv = previousArgv;
  process.exitCode = previousExitCode;
  vi.restoreAllMocks();
});

it("stops only the Compose project when actual publication is unsafe", async () => {
  await import("./stack.mts");
  expect(process.exitCode).toBe(1);
  expect(state.calls).toContainEqual(["compose", "--file", "compose.yaml", "stop", "--timeout", "30"]);
  expect(state.calls.some((args) => args.includes("down") || args.includes("rm") || args.includes("--volumes"))).toBe(false);
});

it("stops partially started services after Compose startup fails", async () => {
  state.failedUp = true;
  await import("./stack.mts");
  expect(process.exitCode).toBe(1);
  expect(state.calls).toContainEqual(["compose", "--file", "compose.yaml", "stop", "--timeout", "30"]);
});

it("rejects changed imported configuration before starting or stopping anything", async () => {
  state.wrongImage = true;
  await import("./stack.mts");
  expect(process.exitCode).toBe(1);
  expect(state.calls.some((args) => args.includes("up") || args.includes("stop"))).toBe(false);
});

it("reuses matching files from an interrupted import before continuing inspection", async () => {
  state.partial = true;
  process.argv[2] = "adopt";
  await import("./stack.mts");
  expect(state.calls.some((args) => args.at(-1)?.includes(".NetworkSettings.Networks"))).toBe(true);
  expect(state.writes).toEqual([]);
});

it("preserves mismatched private files and stops import before any service mutation", async () => {
  state.partial = true;
  state.changedFile = true;
  process.argv[2] = "adopt";
  await import("./stack.mts");
  expect(process.exitCode).toBe(1);
  expect(state.calls.some((args) => args.at(-1)?.includes(".NetworkSettings.Networks") || args.includes("stop") || args.includes("rename"))).toBe(false);
  expect(state.writes).toEqual([]);
});
