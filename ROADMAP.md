# Roadmap and project state

Updated: 21 October 2026.

## Current state

Work continued on `main` at `0ef3e78`, preserving uncommitted BF-006 work. On
21 October the owner authorized the remaining local demonstration and accepted
the policies in [workflow.md](docs/workflow.md). ADR-001 through ADR-003 remain
accepted. Staff access, requests, booking/resource transactions, work orders,
versioned estimates and customer decisions are implemented, with a resource
timeline and detailed table. Local evidence is below. BF-006 through BF-011 are
in Review pending owner review; changes remain unstaged and uncommitted. No
remote state was changed. Publication and deployment remain owner operations.

The initial planning window is 20 October–16 November 2026, with a provisional
72–100 focused-hour budget. Re-estimate after the first working database and
authentication slice; do not claim tracked time retroactively.
Actual active time has not been recorded for BF-002 through BF-006.

## Milestones

| Milestone | Target window | Deliverable and completion condition |
| --- | --- | --- |
| M1 Foundation | 20–26 October | Reproducible app, initial schema/migrations, protected staff path, domain tests and initial CI |
| M2 Booking engine | 27 October–2 November | Requests, availability, atomic confirmation, cancellation/rescheduling and real contention evidence |
| M3 Workshop operations | 3–9 November | Work orders, permitted transitions, immutable estimates, customer decisions and audit evidence |
| M4 Demonstration quality | 10–16 November | Complete synthetic journey, permission/browser tests, honest limitations and approved release preparation |

These are targets. A live deployment requires separate approval. Reduce interface
scope or move dates if core allocation correctness is not proven.

The remaining local implementation was approved as one coherent scope with
checks and review throughout. Manual review/commit is the next boundary;
remote CI execution and deployment are not implied by local completion.

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
| BF-005 / Done | Local database and migration baseline; reproduce persistence | BF-004 committed, accepted ADRs, Docker Linux engine available | 3–4h estimated; actual not recorded / Engineering, owner review | Owner reviewed and committed as `0ef3e78`; real PostgreSQL migration/privilege baseline and required checks passed |
| BF-006 / Review | Workshop, staff and resources; enforce ownership | Owner-reviewed/committed BF-005; accepted ADRs; Docker Linux engine | 3–4h estimated; actual not recorded / Engineering, owner review | Three migrations and unchanged second run; positive synthetic fixtures and 26 rejection cases on real PostgreSQL; privilege/auth ownership checks, lint/typecheck/25 unit tests/build pass; manual review/commit pending |
| BF-007 / Review | Staff login and protected resource read; prove access boundary | BF-003, BF-006 | Prior estimate 3–4h; actual not recorded / Engineering | 11 actual Auth/PostgreSQL cases pass: scoped success, signup denial, anonymous/inactive/nonstaff/wrong-role/wrong-workshop denial and logout |
| BF-008 / Review | Document setup and prepare initial CI; reproduce local checks | BF-004 through BF-007 | Prior estimate 2–3h; actual not recorded / Engineering | Local setup/checks pass; SHA-pinned workflow prepared; remote CI unverified |
| BF-009 / Review | Booking engine and failure tests; prove primary invariant | M1; accepted demo scope | Actual not recorded / Engineering | SQL exclusion/pair constraints, real lock waits, state races, rollback and 100-attempt contention pass |
| BF-010 / Review | Work orders, estimates and decisions; complete operational workflow | BF-009; accepted demo scope | Actual not recorded / Engineering | Assigned work, immutable snapshots, version/expiry/replay guards and complete local journey pass |
| BF-011 / Review | Demonstration and release review; present reproducible evidence | BF-010; accepted timeline addition | Actual not recorded / Engineering | Browser journey, resource timeline and responsive review; local release boundary documented; no deployment or remote CI claim |

BF-003 through BF-008 total roughly 14–21 hours before contingency and ADR work.
These are planning estimates, not measured execution times or guarantees.

## Scope and issue discipline

For each implementation issue, record objective, business/technical reason,
dependencies, in/out-of-scope items, acceptance criteria, tests, estimated effort,
owner and definition of done. The 21 October approved scope below defines BF-009
onward; later expansion still needs explicit scope and acceptance criteria.

Foundation excludes dashboards, customer approval links and a full booking engine.
Later scope reductions may include a schedule table instead of a custom timeline,
minimal settings and no automated notifications. The delivered demonstration
retains the complete workflow and includes both a resource timeline and table.

## Evidence and limitations

- 20 October: the 12 public documentation files passed checks for 19 local
  links/anchors, proposed ADR structure, encoding and formatting. The tracked
  diff passed `git diff --check`; the owner subsequently committed the foundation.
- 19 October: Docker CLI/Compose were available, but the Linux engine was
  unreachable. Recheck before database setup; do not assume it remains stopped.
- No garage-operator validation, booking/allocation/concurrency checks, automated
  end-to-end suite, remote CI or deployment evidence exists yet. BF-005 database
  infrastructure and BF-006 persistence evidence are recorded below.
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

Owner reviews the complete local demonstration, then manually stages only the
public paths, inspects the staged diff and commits. No repository history or
remote operation was executed during implementation. Suggested commit message:
`feat: implement workshop booking and approval workflow`.

Run instructions, synthetic login location and stop conditions are in
[workflow.md](docs/workflow.md). The local services are stopped with volumes
preserved. Inspect exposure before restarting. Remote CI must be verified after
an owner-controlled push; deployment still requires its own explicit decision.

## BF-007 through BF-011 implementation and evidence

Objective: complete the local request-to-handover demonstration while proving
allocation correctness, permissions and exact-version customer decisions.
Owner: Engineering, owner review pending. Actual active time was not recorded.
Prerequisites: accepted ADRs, preserved BF-006 work on `main` at `0ef3e78`, pinned
runtime/dependencies and the project-local Docker platform. Scope was accepted on
21 October, including the policies in [workflow.md](docs/workflow.md) and both a
resource timeline and schedule table. Architecture remains the accepted monolith;
no service, provider or deployment was provisioned.

BF-009 includes request validation/customer-vehicle scope, advisory availability,
atomic confirmation/cancellation/rescheduling, resource absences and a local-day
timeline. BF-010 includes unique check-in/work orders, assigned tasks, explicit
work transitions, integer-GBP estimates, immutable issue snapshots, hashed 48-hour
capabilities, exact-version decisions and audit. BF-011 includes a complete
synthetic browser journey, responsive/keyboard evidence and the local release
boundary. Staff/resource administration is fixture setup, not a management UI.
No notifications, real customers, production provisioning or deployment is in scope.

Executed on 21 October:

- Frozen-lockfile install, lint (including scripts/browser/config files), standalone
  typecheck, 47 unit tests in seven files and production build pass. The build
  has public `/`, `/request`, `/decision` and protected staff routes; no secrets
  are deliberately exposed through public environment variables.
- `db:verify` passes on PostgreSQL 17.11 with btree_gist 1.7: eight migrations,
  matching journal/file hashes, second run zero pending, preserved auth DDL/ACLs,
  26 foundation rejection cases and baseline role/API denial checks.
- Six real-database integration cases pass in their own disposable database.
  They exercise the full lifecycle; exclusion, adjacency, pair/scope/finite-time
  checks; successful and rolled-back rescheduling; retained cancellation history;
  same-booking/different-resource and confirm/cancel/reschedule races; an observed
  independent resource-lock wait; forced failure after allocation and before audit;
  inactive/forged-role/unassigned-tech denial; issued snapshot/line/total guards;
  and version, expiry, replay and concurrent issue/decision handling.
- The final 100-attempt diagnostic had one confirmation, 99 controlled conflicts,
  zero unexpected failures and two active allocations, one for each resource.
  Allocation phase was 192ms in that diagnostic with pool max five. This is local
  correctness evidence, not 100 simultaneous connections or a throughput claim.
- Eleven actual local Auth/runtime tests pass, including global signup denial,
  password sign-in, anonymous/inactive/nonstaff/wrong-role/wrong-workshop denial,
  scoped manager/adviser reads, explicit technician permission and logout.
- Two reproducible Chrome browser cases pass. The full journey covers preserved
  invalid input, conflict handling/cancellation, check-in, exact estimate issue,
  customer approval, technician data minimization/task completion and handover.
  The timeline shows both real resource allocations for the selected local day;
  clicking a reservation focuses its booking. Desktop 1440×1000 and phone 390×844
  screenshots were inspected; no document overflow occurred. Artifacts are local
  under `output/playwright/`. Request availability also passed an interactive
  browser check with zero recorded console warnings/errors for that view.
- Drizzle snapshot consistency and no-change generation pass. The public source,
  migration SQL and permissions were reviewed, and publication/local-link/diff
  checks passed. The staging area remains empty. Prepared CI uses pinned official
  actions and local database/auth/browser gates; no remote run was performed.

Review corrected real defects before closeout: row-lock permission prerequisites,
explicit non-null capability checks (SQL CHECK accepts UNKNOWN), expiry/version
validation before replay acknowledgement, development-effect token preservation,
and keeping a newly issued link visible until copied. Enabling the email provider
while disabling global signup was verified by actual login and signup-denial tests.
One database run was interrupted by a local service restart; its exact disposable
database was inspected and removed without force before the clean passing run.
All disposable verification databases were removed; only synthetic demo records
remain in the local application database. No pre-existing database/volume was reset.

Limitations: Docker still publishes platform ports on all interfaces on this host;
LAN isolation is unproved. Physical occupancy/overruns beyond planned intervals,
real workshop assumptions, production TLS/rate limiting, account recovery,
retention/anonymization, backup/recovery, remote CI and deployment are unverified.
Customer identity is possession of a manually shared capability; independent
recipient verification is not claimed. The interface creates one line per
estimate version; the service supports up to 50. Builds/artifacts remain local:
public release requires a clean source-only build and package inclusion audit.
The historical BF-006 and earlier sections below describe their original scopes;
the current state and evidence above supersede their old next-action statements.

## BF-006 implementation and evidence

Objective: establish workshop ownership and valid staff/resource relationships
before the first protected read. Owner: Engineering; estimate 3–4 active hours,
actual not recorded. Prerequisites verified: BF-005 reviewed/committed at
`0ef3e78`, clean `main`, accepted ADR-001 through ADR-003, Node.js 24.13.0,
pnpm 11.25.0, available Docker Linux engine and passing baseline lint, standalone
typecheck, 25 tests and production build. The documented all-interface network
exposure limitation and project network option were inspected before restart.
No accepted architecture was changed; no dependencies were added.

Implemented three `app` tables, Drizzle declarations/snapshots and two additive
migrations after the unchanged BF-005 baseline. A private timezone validation
function precedes the tables. Constraints enforce required references, valid
roles/types, nonempty space-trimmed names, named timezones, unique workshop/user
membership, resource names per workshop/type and one resource per linked staff
membership. A composite key prevents cross-workshop staff links on insert/update;
bays cannot link staff. Technicians may be unlinked, and schedulable capability
does not require the same-named authorization role. See [persisted rules](docs/data-model.md#bf-006-persisted-rules).

The actual Supabase `auth.users.id` is a required UUID primary key, with the table
owned by `supabase_auth_admin`. Setup grants only auth schema USAGE and ID-column
REFERENCES to the migrator through the local platform administrator; ordinary
`postgres` cannot issue that schema grant on this image. Auth/platform ownership
and separate application logins remain intact. All foreign keys use RESTRICT on
delete/update. Staff/resource deactivation preserves records; no auth deletion
cascade can erase memberships. Runtime receives SELECT only on the three tables,
with no business writes or auth access. API roles remain denied and `app` stays
outside Data API exposure. No runtime client is imported by the application.

Executed `pnpm db:setup` without credential replacement; `pnpm db:verify` created
a new random template0 database, restored actual local auth DDL/ownership/ACLs
without data, then applied all three application migrations. File/journal hashes
matched, and a second run had zero pending migrations and an unchanged journal.
PostgreSQL was **17.11**, with **btree_gist 1.7** in `app`. Synthetic fixtures
covered three workshops, both identities with memberships in multiple workshops,
all staff roles, bays, linked/unlinked technicians, generated resource IDs,
active defaults and deactivation. Twenty-six invalid value/relationship/uniqueness/
deletion cases passed, including actual auth-owner deletion refusal and linked
membership/resource moves between existing workshops. Synthetic records existed
only in the disposable database, which was removed without forced disconnection.

Verified actual runtime login, positive reads and denied DML/TRUNCATE,
schema/table/temp DDL, auth/journal reads, timezone function execution and migration
role assumption. Table/schema ownership, API ACL denial, no auth DML for either
application role and rolled-back default table/function ACL probes passed.
Auth schema-only dumps matched after migrations/fixtures (ignoring pg_dump's
random restrict nonce), preserving platform DDL/ownership/ACLs. The initial test
harness needed platform-admin restore/grants and an owner-role switch for the
auth deletion probe; these were corrected and the full verifier then passed.

Executed additive `pnpm db:migrate` twice on the existing local project database.
Its journal has three entries and its three business tables remain empty; no
synthetic identities or business data were inserted there. No existing database
or volume was reset/deleted. No disposable verification databases remain.
`pnpm exec drizzle-kit check` passes and `pnpm db:generate` reports no changes.
Final `pnpm lint`, standalone `pnpm typecheck`, `pnpm test` (25/25 in two files)
and `pnpm build` pass. Production output retains only the existing static routes.

Complete SQL/schema/snapshot/script/document diff review found no outstanding
integrity/security defect. Ownership-move tests were corrected to isolate the
composite foreign key rather than unrelated existence/uniqueness constraints.
Public encoding/formatting/link/publication checks and `git diff --check` passed;
the index remains empty. Excluded configuration, including `next.config.ts`, was
preserved. No Git history, repository/account settings or remote state was mutated.
Bayframe services were stopped with volumes preserved at closeout.

Limitations: all-interface Docker port publication remains unresolved; LAN
isolation is unproved. Runtime SELECT does not authorize workshop scope: BF-007
must verify sessions, active membership and permitted reads at server boundaries.
Resource active flags do not establish availability. Booking/allocation SQL,
scheduling constraints, retention/anonymization, auth flows, availability services,
UI expansion, CI, deployment and release packaging are excluded/unverified.
No browser or second-machine check was repeated because dependencies/UI are
unchanged. BF-006 is in Review pending owner review/manual commit; BF-007 remains
unstarted and needs separate authorization.

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
This historical BF-005 closeout is superseded by the BF-006 evidence above.

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
