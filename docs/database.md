# Local database and migrations

BF-005 established infrastructure and BF-006 added workshop, staff and resources.
The local workflow now uses eight migrations, 14 tables and scoped runtime services.
See [the demonstration guide](workflow.md) for application/auth setup and checks.
Accepted boundaries are in [ADR-002](adr/002-postgresql-scheduling.md)
and [ADR-003](adr/003-authentication.md).

## Setup (PowerShell, repository root)

Use the pinned Node.js/pnpm versions in [README](../README.md#setup-and-verification)
and a running Docker Linux engine. No hosted project, account or access token is
required. Ports 55421 (local API) and 55422 (PostgreSQL) must be free. Do not reuse
another project's database, container name or volume.

```powershell
Set-Location C:\path\to\Bayframe
pnpm install --frozen-lockfile
docker info --format '{{.OSType}}'
docker network inspect supabase_network_bayframe-local --format '{{json .Options}}'
```

Expected engine: `linux`. On first setup only, if the network is absent:

```powershell
docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 supabase_network_bayframe-local
```

An existing network must have `com.docker.network.bridge.host_binding_ipv4` set
to `127.0.0.1`; stop on a mismatch. Preserve existing containers and volumes.
This network uses the project's standard name so the CLI attaches its service
endpoints to the same network. Do not substitute a shared network.

```powershell
pnpm db:start
docker ps --filter label=com.supabase.cli.project=bayframe-local --format '{{.Names}} {{.Ports}}'
pnpm db:setup
pnpm db:migrate
pnpm db:verify
```

Stop on any failed command. Inspect the published bindings before using the
stack. The documented Docker network option requests loopback binding, but this
host still reported `0.0.0.0` / `::`; isolation from the LAN is not established.
Use only on a controlled local development machine/network and stop the stack
when finished. Do not expose it publicly. No firewall/daemon settings are changed
by setup. The scripts connect only to loopback, which does not itself restrict
incoming network access.
The CLI's start/status output contains local credentials: do not paste it into
issues, documentation or logs intended for publication.

`db:setup` uses `docker exec` and the container's administrative local socket.
It creates two unprivileged login roles with independent random passwords in
ignored `.env.local`. It never overwrites an existing environment file, rotates
an existing role's password or resets data. Existing files must provide
`BAYFRAME_MIGRATOR_PASSWORD` and `BAYFRAME_RUNTIME_PASSWORD` as 64 lowercase hex
characters. Missing/mismatched credentials or unsafe existing role attributes
are failures; preserve the file and volume together. Do not delete either as a
recovery shortcut. Restrict local file access; POSIX file modes do not establish
Windows ACL protection.

BF-006 setup validates the actual `auth.users.id` UUID primary key and its
`supabase_auth_admin` owner. Using the fixed container's platform-administrator
socket, it grants the migrator auth schema USAGE and column-level REFERENCES on
that ID only. Ordinary `postgres` cannot grant that schema permission on this
image. No auth SELECT or write privilege, ownership change or role membership is
granted to application roles. Run setup before the new migrations, including on
an existing BF-005 stack. Setup does not migrate business tables.

The connection target is deliberately fixed: `127.0.0.1:55422`, database
`postgres`, project container `supabase_db_bayframe-local`. No connection strings
or public environment variables are needed. Administrative setup does not use
the runtime credentials. The application uses a five-connection runtime pool at
this fixed endpoint. Recognized disposable verification database names are the
only alternative database targets; no hosted connection setting is accepted.

## Ownership and privileges

Supabase initializes and owns platform/auth objects. The local stack starts only
PostgreSQL, Auth, PostgREST and its gateway; Studio, storage, realtime, email
testing, analytics, edge runtime and pooler are disabled. Starting Auth does not
implement or verify application login/authorization flows.

Drizzle alone owns application migrations in `drizzle/`, with its journal in
`drizzle.__drizzle_migrations`. Supabase application migrations and seeds are
disabled. Never use Supabase reset/push/diff to manage application objects, and
do not apply application SQL by hand outside its migration history.

| Role | Privileges |
| --- | --- |
| Local administrator | Creates logins, database grants and disposable verification databases through the fixed container |
| `bayframe_migrator` | Owns `app` and the migration journal; database CREATE permits migration schemas/trusted extensions; auth USAGE and REFERENCES on `auth.users.id` only; no auth DML, superuser, role/database creation, replication, memberships or RLS bypass |
| `bayframe_runtime` | CONNECT/USAGE, scoped application SELECT/INSERT and required column-level UPDATE only; no DELETE/TRUNCATE, auth access, schema/table/temp DDL, journal access, memberships or RLS bypass |
| API roles | No `app` schema privileges, including `anon`, `authenticated` and `service_role` |

The API exposes only `public` and `graphql_public`, with no `app` search-path
entry. Verification checks the running PostgREST environment as well as config.
The first migration creates `app`, installs trusted `btree_gist` there, denies
API access and removes public function execution defaults for objects created by
the migrator. There is no automatic blanket runtime DML grant. Grant only needed
operations in the migration that introduces each real table. Direct `pg` queries
do not carry an end-user JWT; later application authorization remains required.
Private-schema RLS has not been introduced.

BF-006 adds a timezone validation function followed by the three business tables
and an explicit runtime SELECT grant. The generated table migration includes
reviewed ACL SQL; snapshots describe application tables only, with an external
reference to platform-owned `auth.users`, never its creation or alteration.
The auth foreign key and operational references use RESTRICT; active flags
preserve retired staff/resources. See [persisted rules](data-model.md#bf-006-persisted-rules).
Later migrations add booking/allocation, work, estimates, decisions, absence and
audit tables, reviewed exclusion/deferred pair checks, immutable issued snapshots
and narrow write privileges. Row locks require UPDATE permission on PostgreSQL:
runtime receives UPDATE(id) on staff/resources, with triggers rejecting identity
changes. It still cannot edit role, activity or ownership. Audit/decision rows are
insert-only; allocation history can only acquire a release timestamp.

## Reproducible real-database check

```powershell
pnpm db:verify
pnpm exec drizzle-kit check
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`db:verify` requires a healthy initialized project and creates a new random
`bf_verify_<hex>` database from `template0` on its PostgreSQL instance. It checks
the absence of application/journal/auth schemas, then restores a schema-only
dump of the actual local Supabase auth schema, including ownership and ACLs,
through the fixed platform administrator. No identities or platform data are
copied. It grants the narrow auth reference prerequisite, applies the actual
Drizzle SQL, compares file hashes with the journal, applies it again and asserts
an unchanged journal. It prints actual PostgreSQL and extension versions.
It checks schema ownership/API-role privileges, actual runtime login and denied
DDL/role escalation/journal reads. Transactional synthetic probes check default
table/function privileges and are rolled back. Synthetic fixtures in the
disposable database cover workshops, all three staff roles, multi-workshop
memberships, linked/unlinked technicians, bays, generated IDs/defaults and
deactivation. Twenty-six invalid value/relationship/uniqueness/deletion cases
include cross-workshop inserts/updates, duplicate memberships/names/staff links,
invalid roles/types/timezones and referenced auth/workshop/staff deletion.
Auth deletion is tested as the platform table owner. The check compares auth
DDL/ownership/ACL dumps after application migrations with the source definition
(ignoring only pg_dump's random restrict nonce).

The baseline check confirms reads of the three foundation tables and denies writes
to workshop values, staff activity and resource deletion, as well as
TRUNCATE, auth/journal access, timezone-function execution, DDL and role escalation.
API table/schema denial and no auth DML for either application login are checked.
Database grants do not establish per-user scope. Verified sessions, active scoped
membership and service authorization protect application reads and mutations.

The check closes its connections and drops only the database it created, without
forced disconnections. It does not reset any database or volume. Interrupted
processes can leave a named disposable database; inspect it before any separately
approved manual cleanup. It must never fall back to testing against `postgres`.

Expected migration output: eight applied migrations, second run zero pending and
unchanged journal. Expected generation output: no schema changes. Tests run once.
Stop on a failure; do not treat a skipped database check as a pass.

For future schema work, update `scripts/db/schema.ts`, run `pnpm db:generate`,
review the SQL/snapshot and test against disposable real PostgreSQL. Custom SQL
uses `pnpm db:generate --custom --name <name>`. Keep snapshots consistent with
declarative schemas; extension/ACL SQL remains explicitly reviewed custom SQL.

Stop this project while preserving its data:

```powershell
pnpm db:stop
```

Never use `--all`, `--no-backup`, database reset or volume deletion for routine
setup. No remote CLI link/login/push, hosted provisioning or deployment is part
of these commands. Local plaintext transport and default platform credentials
are for isolated development only. No deployment pooling configuration is chosen.

## Verified baseline and sources

20 October 2026: PostgreSQL **17.11**, image
`public.ecr.aws/supabase/postgres:17.11.0.004`, `btree_gist` **1.7** available and
installed. Exact packages: Supabase CLI 2.121.0, Drizzle ORM 0.45.4, Drizzle Kit
0.31.11, pg and its types 8.23.1. Stable registry versions were selected; the
current Drizzle docs also show release-candidate APIs, so installed stable source
and executed checks establish this baseline. The CLI/image pin does not prove
another machine's Docker networking, extension support or performance. The
documented loopback network option was configured but did not restrict published
ports on Docker Desktop engine 29.9.1 here. Services were stopped at closeout,
preserving volumes; do not interpret a loopback client address as proof of LAN
isolation.

Official references checked before implementation:
[Supabase local setup/network isolation](https://supabase.com/docs/guides/local-development),
[CLI configuration](https://supabase.com/docs/guides/local-development/cli/config),
[Drizzle pg driver](https://orm.drizzle.team/docs/get-started-postgresql),
[custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations),
[migration journal](https://orm.drizzle.team/docs/drizzle-kit-migrate),
[pg connections](https://node-postgres.com/features/connecting),
[PostgreSQL default privileges](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html).
