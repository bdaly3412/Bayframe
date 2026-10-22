import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertLoopbackBindings, assertPreservedConfig, serializeCompose } from "./bindings.mts";

const directory = resolve(".auth/local-stack");
const services = ["db", "auth", "rest", "kong"] as const;
const names = services.map((service) => `supabase_${service}_bayframe-local`);
const compose = ["compose", "--file", "compose.yaml"];

function docker(args: string[]): string {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

type ServiceConfig = {
  Image: string; Env: string[]; Entrypoint: string[] | null; Cmd: string[] | null;
  User: string; WorkingDir: string; Labels: Record<string, string>;
  Healthcheck?: { Test: string[]; Interval?: number; Timeout?: number; StartPeriod?: number; StartInterval?: number; Retries?: number };
};

function checkImportedConfiguration(rendered = false): void {
  const expected = JSON.parse(readFileSync(resolve(directory, "expected.json"), "utf8")) as Record<string, ServiceConfig>;
  const definitions = rendered ? (JSON.parse(docker([...compose, "config", "--format", "json"])) as { services: Record<string, { environment: Record<string, string>; command: string[]; entrypoint: string[]; image: string }> }).services : null;
  for (const [index, service] of services.entries()) {
    const source = expected[service];
    if (definitions) {
      const definition = definitions[service];
      // Compose config retains dollar escaping in commands for round-trip reuse.
      const unescape = (values: string[] | undefined) => values?.map((value) => value.replaceAll("$$", "$")) ?? null;
      assertPreservedConfig({ Image: definition.image, Env: Object.entries(definition.environment).map(([key, value]) => `${key}=${value}`), Cmd: unescape(definition.command), Entrypoint: unescape(definition.entrypoint) }, source);
    } else {
      const actual = JSON.parse(docker(["inspect", names[index], "--format", "{{json .Config}} "])) as ServiceConfig;
      assertPreservedConfig(actual, source);
      assert.deepEqual(actual.Healthcheck, source.Healthcheck);
      assert.equal(actual.User, source.User);
      assert.equal(actual.WorkingDir, source.WorkingDir);
    }
  }
}

function save(name: string, value: string): void {
  const path = resolve(directory, name);
  if (existsSync(path)) {
    assert.equal(readFileSync(path, "utf8"), value, "Existing private import differs; preserve it and inspect the source.");
  } else writeFileSync(path, value, { flag: "wx", mode: 0o600 });
}

function check(): void {
  const records = names.map((name) => JSON.parse(docker(["inspect", "--format",
    '{"Name":{{json .Name}},"State":{"Running":{{json .State.Running}}},"Config":{"Labels":{{json .Config.Labels}}},"NetworkSettings":{"Ports":{{json .NetworkSettings.Ports}}}}', name])) as unknown);
  const project = docker(["ps", "--filter", "label=com.supabase.cli.project=bayframe-local", "--format", "{{.Names}}"]);
  assert.deepEqual(project.split("\n").sort(), [...names].sort(), "Unexpected running local project services.");
  assertLoopbackBindings(records);
  checkImportedConfiguration();
}

async function health(): Promise<void> {
  assert.equal(docker(["exec", names[0], "pg_isready", "-q"]), "");
  for (const address of ["127.0.0.1", "[::1]"]) {
    const response = await fetch(`http://${address}:55421/auth/v1/health`, { signal: AbortSignal.timeout(5000) });
    await response.body?.cancel();
    assert.equal(response.status, 200, "Local Auth health check failed.");
  }
}

function finishAdoption(): void {
  const ids = JSON.parse(readFileSync(resolve(directory, "original-ids.json"), "utf8")) as Record<string, string>;
  for (const name of names) {
    assert.match(ids[name], /^[a-f0-9]{64}$/);
    const actualName = docker(["inspect", ids[name], "--format", "{{.Name}}"]);
    assert([`/${name}`, `/${name}-before-bf017`].includes(actualName), "Original source identity changed; import stopped.");
  }
  checkImportedConfiguration(true);
  docker(["stop", "--timeout", "30", ...Object.values(ids)]);
  for (const name of names) {
    if (docker(["inspect", ids[name], "--format", "{{.Name}} "]) === `/${name}`) docker(["rename", ids[name], `${name}-before-bf017`]);
  }
  if (!existsSync(resolve(directory, "adopted"))) save("adopted", "Existing source containers retained stopped.\n");
  console.log("Existing local configuration imported privately; original containers retained stopped. Data and credentials preserved. Run db:start.");
}

function adopt(): void {
  assert(!existsSync(resolve(directory, "adopted")), "Local services already imported; use db:start. Preserve the private import.");
  if (existsSync(resolve(directory, "services.json"))) {
    finishAdoption();
    return;
  }
  const configuration: Record<string, unknown> = {};
  const expected: Record<string, ServiceConfig> = {};
  const originalIds: Record<string, string> = {};
  // Import only this fixed existing project. Never initialize or substitute a volume.
  assert.equal(docker(["volume", "inspect", "supabase_db_bayframe-local", "--format", "{{.Name}}"]), "supabase_db_bayframe-local");
  docker(["network", "inspect", "supabase_network_bayframe-local", "--format", "{{.Name}}"]);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  for (const [index, service] of services.entries()) {
    const name = names[index];
    const config = JSON.parse(docker(["inspect", name, "--format", "{{json .Config}} "])) as ServiceConfig;
    expected[service] = config;
    assert.equal(config.Labels["com.supabase.cli.project"], "bayframe-local", "Unexpected source project.");
    assert(!config.Labels["com.bayframe.contained"], "Source is already a contained service.");
    assert.equal(docker(["inspect", name, "--format", "{{.State.Running}}"]), "true", "Source services must be running and initialized.");
    const mounts = JSON.parse(docker(["inspect", name, "--format", "{{json .Mounts}} "])) as { Type: string; Name?: string; Destination: string }[];
    assert.equal(mounts.length, service === "db" ? 1 : 0, "Unexpected source mounts; import stopped.");
    if (service === "db") {
      assert.deepEqual(mounts.map(({ Type, Name, Destination }) => ({ Type, Name, Destination })), [
        { Type: "volume", Name: "supabase_db_bayframe-local", Destination: "/var/lib/postgresql/data" },
      ], "Unexpected database volume.");
    }
    assert(config.Env.every((entry) => !/[\r\n]/.test(entry)), "Multiline environment requires review before import.");
    save(`${service}.env`, config.Env.join("\n") + "\n");
    const healthcheck: Record<string, unknown> = {};
    if (config.Healthcheck) {
      healthcheck.test = config.Healthcheck.Test;
      for (const [source, target] of [["Interval", "interval"], ["Timeout", "timeout"], ["StartPeriod", "start_period"], ["StartInterval", "start_interval"]] as const) {
        if (config.Healthcheck[source]) healthcheck[target] = `${config.Healthcheck[source]}ns`;
      }
      if (config.Healthcheck.Retries) healthcheck.retries = config.Healthcheck.Retries;
    }
    const network = JSON.parse(docker(["inspect", name, "--format", "{{json .NetworkSettings.Networks}} "])) as Record<string, { Aliases: string[] }>;
    assert.deepEqual(Object.keys(network), ["supabase_network_bayframe-local"], "Unexpected source network.");
    configuration[service] = {
      container_name: name,
      image: config.Image,
      env_file: [{ path: resolve(directory, `${service}.env`), format: "raw" }],
      entrypoint: config.Entrypoint, command: config.Cmd,
      ...(config.User ? { user: config.User } : {}),
      ...(config.WorkingDir ? { working_dir: config.WorkingDir } : {}),
      ...(config.Healthcheck ? { healthcheck } : {}),
      labels: { "com.supabase.cli.project": "bayframe-local", "com.bayframe.contained": "true" },
      networks: { default: { aliases: network["supabase_network_bayframe-local"].Aliases } },
      restart: "unless-stopped",
      volumes: service === "db" ? ["database:/var/lib/postgresql/data"] : [],
    };
    originalIds[name] = docker(["inspect", name, "--format", "{{.Id}}"]);
    assert.equal(docker(["ps", "-a", "--filter", `name=^/${name}-before-bf017$`, "--format", "{{.ID}}"]), "", "Prior rollback container already exists.");
  }
  const files: Record<string, string[]> = {
    db: ["/etc/postgresql-custom/pgsodium_root.key"],
    kong: ["/home/kong/kong.yml", "/home/kong/localhost.crt", "/home/kong/localhost.key"],
  };
  for (const [service, paths] of Object.entries(files)) {
    const config = configuration[service] as { volumes: unknown[] };
    for (const [index, target] of paths.entries()) {
      const source = resolve(directory, `${service}-file-${index}`);
      const content = execFileSync("docker", ["exec", `supabase_${service}_bayframe-local`, "cat", target], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      save(`${service}-file-${index}`, content);
      config.volumes.push({ type: "bind", source, target, read_only: true, bind: { create_host_path: false } });
    }
  }
  const runner = process.platform === "win32" ? "cmd.exe" : "pnpm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "pnpm exec supabase status -o json"] : ["exec", "supabase", "status", "-o", "json"];
  const status = execFileSync(runner, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.equal((JSON.parse(status) as { API_URL: string }).API_URL, "http://127.0.0.1:55421", "Unexpected local API endpoint.");
  save("auth.json", status);
  save("original-ids.json", JSON.stringify(originalIds));
  save("expected.json", JSON.stringify(expected));
  // Escape Compose interpolation outside raw env files; retain the exact original command.
  save("services.json", serializeCompose({ services: configuration }));
  finishAdoption();
}

let starting = false;
try {
  const action = process.argv[2];
  assert(["adopt", "start", "stop", "check"].includes(action), "Use db:adopt, db:start, db:stop or db:check.");
  if (action === "adopt") adopt();
  else {
    assert(existsSync(resolve(directory, "adopted")), "Missing completed local service import. Run db:adopt against the existing initialized project; never reset or delete its volume.");
    if (action === "stop") {
      docker([...compose, "stop", "--timeout", "30"]);
      console.log("Bayframe services stopped; containers, volumes and private configuration preserved.");
    } else {
      if (action === "start") {
        checkImportedConfiguration(true);
        starting = true;
        docker([...compose, "up", "--detach", "--wait", "--wait-timeout", "120", "--pull", "never"]);
      }
      check();
      await health();
      console.log("Bayframe database and gateway verified on IPv4/IPv6 loopback; PostgreSQL and Auth healthy.");
    }
  }
} catch {
  if (starting) {
    try {
      docker([...compose, "stop", "--timeout", "30"]);
      console.error("Bayframe services stopped after startup verification failed; containers and volumes retained.");
    } catch {
      console.error("Automatic project stop failed; stop Bayframe services locally before further use.");
    }
  }
  console.error("Local stack operation failed. No ready state claimed. Inspect bindings, engine and private import locally; preserve credentials and volumes. Do not publish service output or run a reset.");
  process.exitCode = 1;
}
