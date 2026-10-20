# Roadmap and project state

Updated: 20 October 2026.

## Current state

The checkout started clean on `main` at `1de07b6` on 20 October 2026. The owner
reviewed and committed BF-004, accepted ADR-001 through ADR-003 and authorized
BF-005 only. BF-005 implementation and local checks are complete in Review:
project-local Supabase/PostgreSQL, separate migration/runtime logins, Drizzle's
schema/extension baseline and disposable real-database verification. See
[database setup](docs/database.md) and executed evidence below. Changes remain
unstaged and uncommitted. No remote state was changed or rechecked. Repository
history changes remain owner-controlled. BF-006 has not started or been authorized.

The initial planning window is 20 October–16 November 2026, with a provisional
72–100 focused-hour budget. Re-estimate after the first working database and
authentication slice; do not claim tracked time retroactively.
Actual active time has not been recorded for BF-002 through BF-005.

## Milestones

| Milestone | Target window | Deliverable and completion condition |
| --- | --- | --- |
| M1 Foundation | 20–26 October | Reproducible app, initial schema/migrations, protected staff path, domain tests and initial CI |
| M2 Booking engine | 27 October–2 November | Requests, availability, atomic confirmation, cancellation/rescheduling and real contention evidence |
| M3 Workshop operations | 3–9 November | Work orders, permitted transitions, immutable estimates, customer decisions and audit evidence |
| M4 Demonstration quality | 10–16 November | Complete synthetic journey, permission/browser tests, honest limitations and approved release preparation |

These are targets. A live deployment requires separate approval. Reduce interface
scope or move dates if core allocation correctness is not proven.

Each approved stage ends with implementation, relevant checks, diff review and
manual staging/commit instructions. The next stage starts after owner approval;
routine substeps within the current stage do not require repeated approval.

## Task board

Board states: Backlog → Ready → In Progress → Review → Done. The owner reviews
scope, architectural decisions and completion. Ready does not mean authorized.
Larger tasks should be split into 60–120-minute sessions, each with a concrete
deliverable.

| ID / state | Objective and reason | Dependencies | Estimated effort / owner | Acceptance and verification |
| --- | --- | --- | --- | --- |
| BF-001 / Done | Project documentation; preserve scope and operating rules | Initial scope agreement | Estimate not recorded / Engineering, owner review | Owner committed the reviewed foundation as `abf957f`; documentation checks passed |
| BF-002 / Done | Review three ADRs and resolve bootstrap assumptions; avoid competing architectures | BF-001 complete | 1–2h estimated; actual not recorded / Owner review | Owner accepted ADR-001 through ADR-003 on 20 October 2026; no database/auth implementation implied |
| BF-003 / Done | Bootstrap Next.js, strict TypeScript, pnpm and Vitest; reproducible engineering baseline | Accepted BF-002; owner authorized BF-003 | 2–3h estimated; actual not recorded / Engineering, owner review | Owner reviewed and committed as `c123d29`; prior install/browser evidence below; pinned runtime, lint, standalone typecheck, tests and production build reverified in BF-004 |
| BF-004 / Done | Interval semantics; establish back-to-back scheduling behaviour | Owner reviewed/committed BF-003 and authorized BF-004 | 1–2h estimated; actual not recorded / Engineering, owner review | Owner reviewed and committed as `1de07b6`; 25 tests and required checks pass |
| BF-005 / Review | Local database and migration baseline; reproduce persistence | BF-004 committed, accepted ADRs, Docker Linux engine available | 3–4h estimated; actual not recorded / Engineering, owner review | Empty real PostgreSQL migrations and unchanged second run pass; PostgreSQL 17.11 / btree_gist 1.7; privilege checks, lint/typecheck/25 tests/build pass; manual review/commit pending |
| BF-006 / Backlog | Workshop, staff and resources; enforce ownership | BF-005 | 3–4h / Engineering | Positive fixtures and invalid relationship/uniqueness tests run on real PostgreSQL |
| BF-007 / Backlog | Staff login and protected resource read; prove access boundary | BF-003, BF-006 | 3–4h / Engineering | Valid staff succeeds; anonymous, inactive/non-staff and wrong-role cases fail; no privileged data path exposed |
| BF-008 / Backlog | Document setup and prepare initial CI; reproduce local checks | BF-004 through BF-007 | 2–3h / Engineering | Local checks pass; workflow prepared; remote CI verified only after owner pushes |
| BF-009 / Backlog | Booking engine and failure tests; prove primary invariant | M1 and approved detailed issue | Re-estimate after M1 / Engineering | M2 criteria plus real two-connection contention and rollback tests pass |
| BF-010 / Backlog | Work orders, estimates and decisions; complete operational workflow | M2 and approved detailed issue | Re-estimate after M2 / Engineering | M3 criteria, stale/duplicate decision tests and permissions pass |
| BF-011 / Backlog | Demonstration and release review; present reproducible evidence | M3 and approved detailed issue | Re-estimate after M3 / Engineering | M4 evidence inspected; deployment remains a separate authorization |

BF-003 through BF-008 total roughly 14–21 hours before contingency and ADR work.
These are planning estimates, not measured execution times or guarantees.

## Scope and issue discipline

For each implementation issue, record objective, business/technical reason,
dependencies, in/out-of-scope items, acceptance criteria, tests, estimated effort,
owner and definition of done. The milestone rows are not authorization to build
the whole application. Before BF-009 onward, split the milestone into bounded
issues using that format.

Foundation excludes dashboards, customer approval links and a full booking engine.
Later scope reductions may include a schedule table instead of a custom timeline,
minimal settings and no automated notifications. These remain proposals until
accepted; do not silently remove the required end-to-end workflow.

## Evidence and limitations

- 20 October: the 12 public documentation files passed checks for 19 local
  links/anchors, proposed ADR structure, encoding and formatting. The tracked
  diff passed `git diff --check`; the owner subsequently committed the foundation.
- 19 October: Docker CLI/Compose were available, but the Linux engine was
  unreachable. Recheck before database setup; do not assume it remains stopped.
- No garage-operator validation, business-table/transaction/concurrency checks,
  automated end-to-end suite, remote CI or deployment evidence exists yet.
  BF-005 database infrastructure evidence is recorded below.
- The owner committed the documentation foundation as `abf957f` on 20 October.
  The later ignore-policy commit is `3d6ebba`; read-only remote verification found
  the same SHA on `refs/heads/main`. The prior access blocker is resolved for that
  publication. BF-003 subsequently added the application foundation described below.
- Shared ignore rules cover dependencies, generated builds, local credentials,
  test results and artifacts. Local setup does not change application readiness.
- BF-002 reviewed official Next.js, PostgreSQL, Drizzle and Supabase documentation
  and specified the baseline in ADR-001 through ADR-003. The owner accepted all
  three on 20 October. Acceptance is not database/migration/security evidence.
- BF-003: Node.js 24.13.0 and pnpm 11.25.0 are declared exactly. Next.js 16.4.2,
  React/React DOM 19.3.1, Tailwind 4.3.3, TypeScript 5.9.3, ESLint 9.39.4 and
  Vitest 5.0.5 are pinned, with compatible dependencies in the lockfile. Runtime
  and peer requirements were checked against package metadata and official docs.
- Executed from the repository root: `pnpm install --frozen-lockfile`, `pnpm
  lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` all passed. The one test
  renders the actual page using React DOM's server renderer and the `@/*` alias.
  Production build prerenders `/` and `/icon.svg`; no application data path exists.
- A fresh dependency directory at
  `output/verification/clean-install-0a8cd232` passed `pnpm --dir
  output/verification/clean-install-0a8cd232 install --frozen-lockfile`. A copy of
  the public source/config also passed standalone typecheck and the test there
  without generated Next.js files or private configuration. Dependencies used a
  shared local package cache; this was not a cache-empty or second-machine check.
- Development command `pnpm dev --hostname 127.0.0.1 --port 3001` served `/` with
  HTTP 200 and expected content. Production command `pnpm start --hostname
  127.0.0.1 --port 3000` was inspected in Chromium at 1440×1000 and 390×844.
  Title/content, responsive wrapping, visible keyboard skip link and focus moving
  to main passed. Mobile document width matched the 390px viewport. Final browser
  console had zero errors/warnings and all nine recorded requests returned 200.
  Local screenshots/snapshots are in `output/playwright/` (ignored).
- The first browser pass found a missing favicon; an application-owned SVG icon
  resolved it. A bounded source review found no remaining actionable defects.
  UI review retained the brief's system typography and restrained layout.
- Public-file inspection and `git diff --check` passed. Private configuration,
  instructions, browser session data and output artifacts remain excluded. The
  staging area is empty. Git exclusions alone do not prove release packaging;
  inspect that at the separately authorized release stage.

## Next action

Owner reviews BF-005 and manually stages/commits its explicit public paths:
`README.md`, `ROADMAP.md`, `STACK.md`, `docs/architecture.md`, `docs/database.md`,
`package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `drizzle.config.ts`,
`drizzle/0000_baseline.sql`, both `drizzle/meta/` JSON files, `scripts/db/schema.ts`,
the four `scripts/db/*.mts` files and `supabase/config.toml`.
Then separately authorize BF-006 workshop/staff/resource persistence in a fresh
task. Before restarting local services, inspect network exposure as documented;
loopback-only publication was not established on this Docker Desktop host.
No business tables or authentication flow are included in BF-005.

Suggested owner commit message: `feat: establish local database migration baseline`.

## BF-005 implementation and evidence

Objective: reproduce local persistence before business tables. Owner: Engineering;
estimate 3–4 active hours, actual not recorded. Prerequisites verified before
implementation: owner-approved BF-004 committed at `1de07b6`, clean checkout,
accepted ADR-001 through ADR-003, Docker Linux engine, pnpm 11.25.0 and script
runtime Node.js v24.13.0. Existing lint, standalone typecheck, 25 one-shot tests
and production build passed before dependency changes.

Implemented: local project `bayframe-local` on dedicated ports 55421/55422;
Supabase owns platform/auth objects, with application migrations/seeds disabled.
Drizzle/pg owns `app`, the migration journal, `btree_gist` and application ACLs.
The API exposes `public,graphql_public`; `app` is absent from exposure/search
paths and API roles have no schema privileges. Runtime has CONNECT/USAGE only;
no business DML is granted. Migration/runtime roles have no elevated role flags
or memberships; runtime cannot perform schema/table/temp DDL, assume the migration
role, read its journal or read `auth.users`. No application runtime client or
connection pool is added before a real query requires it.

Pinned new dependencies: Drizzle ORM 0.45.4, Kit 0.31.11, pg and @types/pg 8.23.1,
Supabase CLI 2.121.0. Current official documentation, CLI help, registry metadata
and installed stable APIs were checked. `pnpm install --frozen-lockfile` passed
after installation. Required build scripts remain limited to existing allowed
esbuild/resolver entries; the CLI uses its packaged platform binary.

Executed `pnpm db:setup`, `pnpm db:migrate` and `pnpm db:verify` on real PostgreSQL.
Setup reran successfully without rotating passwords or overwriting `.env.local`.
The database image is `public.ecr.aws/supabase/postgres:17.11.0.004`;
`SHOW server_version` returned **17.11**. `btree_gist` **1.7** was installed by
the migration in `app`. The verifier created a unique disposable database from
`template0`, checked that app/journal/auth schemas were absent, applied one
migration, compared its hash with the journal and reran migrations: zero pending,
unchanged journal. It verified ownership/API denial, real runtime login and
privilege failures, plus rolled-back default table/function ACL probes. Its
connections closed and its own disposable database was removed without force.
No pre-existing database or volume was reset/deleted, and the pre-existing
separate Supabase stack was preserved.

A bounded source review found a missing `app` entry in the initial Drizzle
snapshot. Correcting it prevents a duplicate CREATE SCHEMA on the next migration.
`pnpm exec drizzle-kit check` passes; `pnpm db:generate` reports no schema changes.
Final `pnpm lint`, standalone `pnpm typecheck`, `pnpm test` (25/25 in two files)
and `pnpm build` pass. Database scripts use native Node TypeScript support and
are included in lint/typecheck. The build still prerenders only the existing
status page, not a database-dependent route.

Public source/config/docs, migration SQL/journal/snapshot and dependency changes
were reviewed. Formatting/local-link/publication checks and `git diff --check`
passed. Staging remains empty. Excluded configuration, including `next.config.ts`,
was preserved; its SHA256 matches the starting value. Supabase scratch state is
locally excluded, and the generated tool-specific ignore file was removed.
Random credentials stay ignored and were never printed. No Git history or
remote operations occurred.

Limitations: Docker engine 29.9.1 still published ports on all interfaces despite
the documented loopback network option. LAN isolation was not proven; no global
firewall/daemon settings were changed. Bayframe services were stopped at closeout
with volumes preserved. Inspect exposure before restarting on a controlled local
machine/network. The setup is local-only and contains no production credential,
transport, pooling, backup/recovery or release-packaging guarantee. There are no
workshop/staff/resource tables, booking/allocation SQL, scheduling constraints,
auth flows, availability services, UI changes, CI or deployment. No second-machine
installation/browser check was repeated. BF-006 requires separate authorization
and must verify the actual auth reference/deletion rules against the local schema.

## BF-004 implementation and evidence

Objective: establish finite, non-empty half-open interval semantics before
persistence, following accepted ADR-002. Owner: Engineering; estimate 1–2 active
hours, actual not recorded. Prerequisites verified: BF-003 owner approval,
committed foundation `c123d29`, clean initial checkout, pnpm `11.25.0` and script
runtime Node.js `v24.13.0`. Existing pinned dependencies/configuration are unchanged.

In scope: `src/scheduling/interval.ts` exports readonly `Interval`, validated frozen
construction and symmetric overlap. Endpoints are absolute Unix epoch milliseconds;
finite negative/fractional numbers are allowed. Both public functions reject
invalid endpoints with `RangeError`, including structural interval inputs to
overlap. There are no imports or framework/database dependencies in the module.
See [representation and validation](docs/intervals.md).

Executed from the repository root on 20 October 2026: `pnpm lint`, `pnpm typecheck`,
`pnpm test` and `pnpm build` all passed with exit code 0. The standalone typecheck
ran before the build. Tests passed 25/25 across two files: 24 interval tests and
the existing rendering smoke test. Cases cover partial overlap, strict containment,
shared starts/ends, identical intervals, disjoint intervals, adjacency in both
orders and symmetry; empty/reversed, NaN/infinite and non-numeric endpoints fail
at construction and in either overlap argument. Negative/fractional endpoints and
frozen construction are also checked. Production output still prerenders `/`,
`/_not-found` and `/icon.svg`.

Complete changed/new public-file review, formatting/encoding and local-link
checks passed. `git diff --check` passed and the staging area remained empty.
Local excluded configuration was preserved. No dependencies or UI were changed;
no database/auth, SQL, booking/availability services, CI, deployment or remote
operations were introduced. The owner subsequently reviewed and committed
BF-004 as `1de07b6`; its prior review/commit boundary is complete.

Limitations: these tests prove in-memory interval semantics only. They do not
prove PostgreSQL precision/mapping, constraints, transactions, permissions or
concurrency. Local-time ambiguity and overrun policies remain BF-009 requirements.
No fresh install or browser review was repeated because dependencies and UI are
unchanged. No release-package verification or production-readiness claim is made.

## BF-003 implementation contract

Objective: reproducible minimal application and unit-test tooling, so later
business work has a verified baseline. Owner: Engineering; estimate 2–3 active
hours, to be replaced/supplemented by actual recorded time if tracked.

Prerequisites: accepted ADR-001 through ADR-003, approved BF-003 scope, compatible
runtime/package manager, preservation of existing documentation and local settings.

In scope: pinned compatible dependencies, strict TypeScript, Next.js App Router
under `src/app`, Tailwind, ESLint, Vitest, one public status page and documented
setup/check commands. Include one rendering smoke test of the initial page using
the installed React DOM server renderer, proving the Vitest/import baseline.
Do not add browser-simulation dependencies or a domain abstraction for that test;
behavioural scheduling tests begin in BF-004.

Out of scope: database/Drizzle/Supabase setup or dependencies, authentication,
scheduling/domain modules, dashboards, component kits, CI, deployment and remote
changes. Do not scaffold empty future modules.

Definition of done: clean frozen-lockfile install, lint, standalone TypeScript
check, one-shot unit tests and production build all pass. Run the app, inspect
the public page in a browser and record the outcome; a build is not browser
verification. Preserve documents/settings, inspect all new public files and
report missing checks explicitly. Document exact commands that actually ran.

Failure policy: fix failures within scope; stop for missing credentials, required
external mutations or a real product decision. Do not silently skip a required
check. End after updating this roadmap and reviewing the complete diff.
