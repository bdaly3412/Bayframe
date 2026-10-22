# Roadmap and project state

Updated: 22 October 2026.

## Current state

BF-014 began from clean `main` at `46cdb89`, including the completed BF-013 frontend, and was committed by the owner as `af52dbc10c20054986044b2c9457fd678cc70b89` (`fix: complete backend verification and workflow error handling`). Its 20 paths include the requirement matrix, backend fixes and verification. BF-015/BF-016 documentation is committed in current `HEAD` `3e3ed4e`. BF-017 began with a clean working tree and empty index. The owner approved replacing local CLI orchestration with Compose; that implementation now passes local containment, health, authentication, browser and restart checks while preserving existing data and credentials. Changes await owner review and manual commit. ADR-001 through ADR-003 and accepted workflow policies remain unchanged. Earlier phase evidence below is historical.

The initial planning window is 20 October–16 November 2026, with a provisional
72–100 focused-hour budget. Re-estimate after the first working database and
authentication slice; do not claim tracked time retroactively.
Actual active time has not been recorded for BF-002 through BF-013.

## Milestones

| Milestone | Target window | Deliverable and completion condition |
| --- | --- | --- |
| M1 Foundation | 20–26 October | Reproducible app, initial schema/migrations, protected staff path, domain tests and initial CI |
| M2 Booking engine | 27 October–2 November | Requests, availability, atomic confirmation, cancellation/rescheduling and real contention evidence |
| M3 Workshop operations | 3–9 November | Work orders, permitted transitions, immutable estimates, customer decisions and audit evidence |
| M4 Demonstration quality | 10–16 November | Complete synthetic journey, permission/browser tests, honest limitations and approved release preparation |

These are targets. A live deployment requires separate approval. Reduce interface
scope or move dates if core allocation correctness is not proven.

The approved local implementation and owner commit are complete. Remote CI,
release preparation and deployment remain separate; none follows from local
completion.

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
| BF-006 / Review | Workshop, staff and resources; enforce ownership | Owner-reviewed/committed BF-005; accepted ADRs; Docker Linux engine | 3–4h estimated; actual not recorded / Engineering, owner review | Foundation persistence/26 rejection cases passed; implementation included in owner commit `bc34cce`; current prototype acceptance evidence below |
| BF-007 / Review | Staff login and protected resource read; prove access boundary | BF-003, BF-006 | Prior estimate 3–4h; actual not recorded / Engineering | 11 actual Auth/PostgreSQL cases pass: scoped success, signup denial, anonymous/inactive/nonstaff/wrong-role/wrong-workshop denial and logout |
| BF-008 / Review | Document setup and prepare initial CI; reproduce local checks | BF-004 through BF-007 | Prior estimate 2–3h; actual not recorded / Engineering | Local setup/checks pass; SHA-pinned workflow prepared; remote CI unverified |
| BF-009 / Review | Booking engine and failure tests; prove primary invariant | M1; accepted demo scope | Actual not recorded / Engineering | SQL exclusion/pair constraints, real lock waits, state races, rollback and 100-attempt contention pass |
| BF-010 / Review | Work orders, estimates and decisions; complete operational workflow | BF-009; accepted demo scope | Actual not recorded / Engineering | Assigned work, immutable snapshots, version/expiry/replay guards and complete local journey pass |
| BF-011 / Review | Demonstration and release review; present reproducible evidence | BF-010; accepted timeline addition | Actual not recorded / Engineering | Browser journey, resource timeline and responsive review; local release boundary documented; no deployment or remote CI claim |
| BF-012 / Done | Complete prototype acceptance and launch local preview | Committed baseline `bc34cce`; owner continuation | Actual not recorded / Engineering | Owner committed as `d621fe2`; 56 unit tests, 10 PostgreSQL cases, 11 live auth cases, two browser journeys and required gates passed; revised scope/task audit/same-tab link regressions covered |
| BF-013 / Review | Redesign the complete frontend around schedule and job sheets | Committed prototype `d621fe2`; approved redesign scope | Actual active time not recorded / Engineering, owner review | 60 unit, 10 PostgreSQL, 11 live auth and 18 browser tests; lint, standalone typecheck, build, migrations, responsive/error evidence and final correction review pass |
| BF-014 / Done | Complete and verify the accepted backend with supported frontend workflows | Clean `main` at `46cdb89`; complete backend phase authorized | Actual active time not recorded / Engineering; owner review 22 October | Owner accepted local technical evidence; committed as `af52dbc`; matrix and executed checks below; BF-015 corrects stale closeout status |
| BF-015 / Done | Reconcile BF-014 closeout and record the next-stage decision package | BF-014 owner review and committed evidence | Actual active time not recorded / Engineering, owner review | Git, service and policy evidence reconciled in this roadmap; no matrix inconsistency found; recommends a bounded local exposure decision before any shared demo |
| BF-016 / Review | Assess local-demo service exposure without configuration changes | Owner authorized read-only host-scoped assessment; BF-015 evidence | Actual active time not recorded / Engineering, owner review | Local non-loopback TCP access demonstrated; firewall evidence and limits below; owner-only isolation remains unproved pending separately authorized containment |
| BF-017 / Review | Contain and reproduce the local demonstration while preserving data | Entire bounded phase and subsequent Compose replacement explicitly approved | Actual active time not recorded / Engineering, owner review | Explicit dual-loopback database/gateway publication; host-origin non-loopback denial; data/credential continuity; guarded startup and controlled stop/start verified; executed checks below |

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
- At the initial documentation baseline, there was no booking/concurrency or
  browser-suite evidence. BF-009 through BF-012 now provide that local evidence
  below; garage-operator validation, remote CI and deployment remain unverified.
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

Owner reviews the BF-017 diff and the running synthetic demonstration, then
stages explicit public paths and commits manually if accepted. The next task is
BF-018, a read-only owner-acceptance review of that committed local evidence.
Do not share the demo over a network. Remote CI, release preparation and
production work remain separate decisions.

Run instructions, synthetic login location and stop conditions are in
[workflow.md](docs/workflow.md). At BF-017 closeout the application runs at
`127.0.0.1:3000`; the database and gateway publish only on IPv4/IPv6 loopback.
Original CLI containers remain stopped with `-before-bf017` names. Keep their
volume, matching credentials and the private service import. Remote CI must be verified after
an owner-controlled push; deployment still requires its own explicit decision.

## BF-014 backend completion and current evidence

Objective: complete the accepted backend in one phase through source audit,
necessary implementation, supported frontend integration, current checks and
independent review. Baseline: clean `main` at `46cdb89`. Actual active time is not
recorded. The [requirement matrix](docs/backend-coverage.md) maps policy, entry
point, service, database enforcement and current evidence for every accepted
capability. No accepted local requirement remains missing or blocked. Earlier
planning questions are resolved by the accepted ADRs and later workflow policy.

Changes:

- Estimate history resolves the parent work order, so the link opens the exact
  version in its job sheet rather than an unavailable `work=null` destination.
- Reservation/absence overlap returns a controlled conflict and preserves both
  absence and audit state on failure.
- Dedicated runtime credentials are validated before `pg` can fall back to
  unrelated environment defaults. Idle pool errors are safely logged; a failed
  connection is replaced on the next query without retrying uncertain mutations.
- Operational failures now identify the validated operation, safe category,
  outcome and correlation UUID without printing input, SQL or capabilities.
- Direct Server Action permission/validation/redaction coverage was added. Real
  PostgreSQL tests replace the invalid old estimate race with coordinated valid
  operations, both revision/approval orders, duplicate issue/decisions, monetary
  limits and audit-failure rollback. Issued token/expiry/version/ownership and
  line deletion remain immutable under direct SQL.
- Browser coverage adds conflicting/successful rescheduling, cancellation,
  rejection, absence recovery and exact estimate-history navigation. Requests,
  customer decisions and technician completion use the real application path.
  A real Auth refresh is also tested. Stale privilege claims and a machine-specific
  setup path were corrected in public documentation.

Executed from the repository root on 22 October 2026:

| Command / check | Current result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed, pnpm 11.25.0; existing lockfile preserved |
| `pnpm lint` | Passed, zero warnings |
| `pnpm typecheck` | Passed independently of build |
| `pnpm test` | 91 passed across 10 files |
| `pnpm db:verify` | Passed: 8 migrations, unchanged second-run journal, PostgreSQL 17.11 / btree_gist 1.7, platform ownership/API/runtime denial and 26 foundation rejection cases |
| `pnpm test:integration` | 17 passed against a fresh disposable database; connections closed and only that database removed |
| `BAYFRAME_LIVE_TESTS=1` with the documented Auth test command | 12 passed against actual local Auth/runtime, including refresh and logout |
| `pnpm auth:setup`; `pnpm demo:seed` twice | Passed; existing synthetic credential file unchanged |
| `pnpm db:migrate` | Existing supported database remains current; no schema/migration changes |
| `pnpm build` | Passed with the pinned Node.js 24.13.0 / Next.js 16.4.2 runtime |
| `pnpm test:browser` | 19 passed in Chrome, including the complete request-to-handover/revision journey and new booking/absence coverage |
| Diff/publication checks | Empty index, formatting/local links, public text and client-bundle credential boundaries inspected; no private workflow files selected |

Five coordinated estimate race pairs observed ten independent transaction lock
waits and asserted final estimate/work/decision/audit state. The 100-booking
diagnostic produced one confirmation, 99 controlled conflicts and two active
allocations with pool maximum five; this is correctness evidence, not throughput.
The recovery test terminated only its identified idle runtime connection inside
the disposable database and verified a successful replacement query. No existing
demonstration database, shared volume or historical record was deleted/reset.

The initial browser run passed the existing 18 tests and exposed an incorrect
selector in the new test. Targeted correction also accounted for already-open
details elements. Independent review found that random fixture dates could collide
with preserved bookings/absences; the corrected test checks full capacity across
both candidate slots and advances to another weekday with a bounded search.
The final 19-test run passed. Normal journey error counts and capability URL/
referrer leak counts were zero; fragment capabilities are removed from the visible
customer URL after load. No layout or design-system change was introduced.

Independent source/requirements and final adversarial reviews found no remaining
substantiated authorization, capability or transaction defect in the changed local
paths. Mocked action tests prove entry routing/error handling; they do not replace
the real database, Auth or browser evidence. No security certification follows.

Limitations/exclusions: staff/resources/settings administration remains synthetic
setup-only; the UI creates one estimate line while the service supports 1–50.
Variable durations, specialized resources, physical overrun handling, automated
messages and accounting remain excluded. Production abuse controls, TLS/cookies,
backup/recovery, stricter revocation, network isolation, remote CI/deployment and
real workshop validation remain unverified and require their own decisions.
Docker's platform port exposure remains an existing local risk. The existing
interface prerelease dependency was not changed. No dependency, architecture,
business policy or migration changed in BF-014. The owner subsequently recorded
the completed phase in commit `af52dbc`; no remote state changed.

Owner review on 22 October accepted this local technical evidence. The owner
committed the phase as `af52dbc10c20054986044b2c9457fd678cc70b89`; the verified
working tree is clean and `HEAD` equals `origin/main`. The prior closeout wording
that said BF-014 was unstaged and history unchanged described the pre-commit
state and is superseded. No remote mutation or deployment was made during this
review. The local app currently returns HTTP 200 at `127.0.0.1:3000`; Auth health
returns HTTP 200 and PostgreSQL accepts connections. Bayframe's Docker database
port 55422 and gateway port 55421 currently publish on `0.0.0.0` and `::`.
Local owner review is reachable; service isolation and shared-LAN demo safety
are not established. Synthetic credentials remain in ignored
`output/demo-credentials.txt`.

## BF-015 closeout and next-stage decision package

### Verified facts

- `HEAD` and `origin/main` are `af52dbc10c20054986044b2c9457fd678cc70b89`;
  the commit has 20 changed paths and one parent (`46cdb89`). The index and
  working tree were clean at review. The completed BF-013 frontend is part of
  the parent baseline.
- The owner accepted BF-014's local technical evidence on 22 October. This
  roadmap records the closeout reconciliation; no test suite was rerun for BF-015.
- The [requirement matrix](docs/backend-coverage.md) and accepted
  [workflow policy](docs/workflow.md) agree that estimate authoring creates one
  line in the current UI while the service accepts 1–50 lines. The UI limitation
  is explicit; it is not an accepted-requirement gap. Review against
  [ADR-001](docs/adr/001-modular-monolith.md),
  [ADR-002](docs/adr/002-postgresql-scheduling.md), and
  [ADR-003](docs/adr/003-authentication.md) found no other factual matrix
  inconsistency. No accepted requirement was broadened.
- At review, the app returned HTTP 200 on loopback port 3000, Auth health
  returned HTTP 200, and PostgreSQL accepted connections. Docker published
  Bayframe database port 55422 and gateway port 55421 on `0.0.0.0` and `::`.
  These are point-in-time local checks, not network-isolation evidence.

### Readiness distinctions

| Area | Evidence-based status | Boundary |
| --- | --- | --- |
| Local demo | The documented synthetic one-workshop journey is implemented; app and local dependencies currently answer checks. The app is reachable for on-host owner review; overall environment safety remains conditional on the published service ports. | Do not share the demo over a network until service reachability/exposure is resolved. No real workshop or customer validation. |
| Release preparation | Not complete or authorized. Local build and test evidence exists in BF-014; remote CI, packaged-artifact review and release operations were not verified here. | A separate bounded release-preparation task and owner decision are required. |
| Production | Readiness is not demonstrated. TLS/cookies, abuse controls, backups/recovery, monitoring, isolation, operational ownership and real-world validation remain unverified or excluded. | No deployment, provisioning or production-readiness claim. |

### BF-016 assessment scope (subsequently authorized)

Authorize one read-only, host-scoped assessment to determine whether the
currently published database and gateway ports are reachable beyond loopback,
using local listener/firewall evidence and a controlled reachability check where
available. Do not change firewall, Docker, service or application configuration
within that assessment. Acceptance: record the observed bindings, tested
reachability and limits; conclude either that the owner-only local demo boundary
is evidenced or that it remains blocked pending a separately authorized
containment change. Stop if the check would require a remote host, network
change, credential disclosure, data reset or production/release action. This is
a proposal that the owner subsequently authorized for BF-016. That authorization
does not accept an architecture or configuration change.

## BF-016 local-demo exposure evidence — 22 October 2026

Owner authorized a read-only assessment of the current host. Observations were
taken approximately 01:39–01:41 Europe/London; they are a local snapshot, not a
durable network guarantee. The pre-existing BF-015 roadmap edits were preserved.

### Observed bindings and connections

`docker ps`, selected port fields from `docker inspect`, and Windows
`Get-NetTCPConnection -State Listen` showed:

- Database: host port 55422 maps to container port 5432 on `0.0.0.0` and `::`.
- Gateway: host port 55421 maps to container port 8000 on `0.0.0.0` and `::`.
- Both container host-port requests have an empty HostIp. The Docker network
  option still requests `host_binding_ipv4=127.0.0.1`; the actual published
  bindings above take precedence as evidence. Container-network IPv6 is disabled,
  which does not prevent the observed IPv6 host publication.
- Windows has `::` listeners for both platform ports owned by Docker's backend
  and additional `::1` listeners owned by the WSL relay. The application has an
  IPv4 loopback listener at `127.0.0.1:3000`, owned by its Node process.

Controlled TCP checks used this host as both source and destination, with a
1.5-second wait per connection and each socket disposed after the attempt:

| Destination on this host | App 3000 | Gateway 55421 | Database 55422 |
| --- | --- | --- | --- |
| IPv4 loopback `127.0.0.1` | Connected | Connected | Connected |
| IPv6 loopback `::1` | Timed out | Connected | Connected |
| Current LAN IPv4 address | Timed out | Connected | Connected |
| Current virtual-adapter IPv4 address | Timed out | Connected | Connected |

These checks demonstrate TCP acceptance through local non-loopback addresses;
they do not establish access from another machine, successful authentication,
data access or an external firewall traversal. Timeouts do not identify their
cause. No remote host or non-loopback IPv6 destination was tested.
`docker exec supabase_db_bayframe-local pg_isready -q` returned exit 0, proving
PostgreSQL readiness inside its container, separately from the TCP checks.

### Host firewall evidence and limits

`Get-NetConnectionProfile` reported the Internet-connected interface as Public
and another interface as Private with no traffic. `Get-NetFirewallProfile
-PolicyStore ActiveStore` reported all three profiles enabled, default inbound
Block, default outbound Allow, and inbound/local rules allowed. The Windows
firewall service was running.

Queried 371 enabled inbound ActiveStore rules and inspected associated port,
application, service, address and interface filters for TCP/Any rules relevant
to these ports, Docker/WSL/Node programs or broad port/program/service matches.
The Docker backend has an enforced Public-profile TCP block rule covering any
local/remote port and address, on any interface. A Public-profile Node TCP allow
rule points to a different executable path from the current application process.
Other broad-looking application/capability rules were not treated as universal
allow rules or proof of an effective packet decision.

The default and Docker block rule are evidence of filtering, not demonstrated
off-host isolation. No remote packet test, packet trace, router/NAT review,
complete Windows Filtering Platform/Hyper-V policy audit, IPv6 ingress test or
independent-host check was performed. Self-connections cannot validate those
paths. Docker's [port-publication documentation](https://docs.docker.com/engine/network/port-publishing/)
distinguishes default publication from explicit loopback publication; Microsoft's
[firewall-rule documentation](https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewallrule?view=windowsserver2025-ps)
explains why the associated filters must also be inspected.

### Assessment and owner decision

**Assessment complete; owner-only isolation is not established.** The current
environment is not adequately bounded for an owner-only demo claim. Local
non-loopback access is demonstrated; off-host reachability is unknown, rather
than proved open or closed. The Public firewall block reduces the apparent
ingress risk but does not establish an invariant loopback boundary. Keep shared
demo approval blocked pending separately authorized containment and verification.

Next action: owner reviews this assessment and decides whether to authorize
BF-017 to prepare one bounded containment proposal, including its concrete
change, rollback and local acceptance checks. Implementation needs separate
approval; no architecture or accepted policy changed here.

No firewall, network, Docker, service or application configuration was changed;
services and data were preserved. No credentials or response bodies were read
or printed. Application suites and fresh HTTP status checks were not completed;
the earlier HTTP 200 observations remain historical. No Git mutation, remote
probe, release, deployment or production action occurred. `ROADMAP.md` is the
only repository file changed for this assessment.

## BF-017 containment investigation — 22 October 2026

The initial investigation below reached an orchestration approval boundary. The
owner subsequently explicitly approved the documented Compose replacement; its
implementation and executed evidence follow the historical investigation.

### Initial investigation evidence (superseded runtime snapshot)

- Started on clean `main` at `3e3ed4e`, with an empty index; BF-015/BF-016 are
  committed. The initial investigation changed this roadmap and two setup guides.
- Installed Supabase CLI/package is 2.121.0. The normal startup remains
  `pnpm db:start` → `supabase start`. Its help supports `--network-id` but exposes
  no host-address publication flag. Both service port specifications convert
  numeric configuration values to strings and the shared argument builder emits
  `-p <hostPort>:<containerPort>`, without an explicit host address.
- The existing project network configuration requests a loopback default; BF-016
  observed wildcard publications despite it. Those runtime observations remain
  historical: current Docker context is `desktop-linux`, but its Linux-engine
  named pipe is absent. Selected container-binding/network/mount inspection
  failed because the daemon was unavailable. No service recreation was attempted.
- Windows reported zero listening sockets on 3000, 55421 and 55422. Host-origin
  TCP checks to IPv4/IPv6 loopback and all six currently assigned preferred
  non-loopback addresses (four IPv4 and two scoped IPv6) established no
  connections. Both application HTTP and Auth health requests were unavailable.
  These are unavailable-service observations, not successful containment evidence.
- All three Windows firewall profiles are enabled with default inbound Block
  and outbound Allow. Two enabled Public inbound Docker-backend block rules
  were present. This narrower recheck does not establish complete effective
  filtering or off-host isolation; the associated filters were not re-audited.
- `pnpm lint`, standalone `pnpm typecheck` and `pnpm test` passed: 10 files,
  91 unit tests. No new validation logic was introduced. Database readiness,
  authentication/authorization, browser journey, data/credential continuity and
  controlled restart were not verified. No database-creating checks or fixture
  changes were run. No production build was required for documentation-only edits.

### Mechanism and limits

The [pinned argument builder](https://github.com/supabase/cli/blob/v2.121.0/apps/cli/src/command-internal/db-bootstrap/docker-create-args.ts),
[database specification](https://github.com/supabase/cli/blob/v2.121.0/apps/cli/src/command-internal/db-bootstrap/postgres.service.ts)
and [gateway specification](https://github.com/supabase/cli/blob/v2.121.0/apps/cli/src/commands/start/services/kong.service.ts)
establish the omission of explicit addresses for both publications.
[Supabase's supported network-default approach](https://supabase.com/docs/guides/local-development)
matches the existing configuration's intent.
[Docker documents explicit loopback publication](https://docs.docker.com/engine/network/port-publishing/)
and network binding defaults separately. No supported explicit-address setting
was found in the pinned startup path. The exact reason Docker Desktop did not
honour the network default has not been established. A reported similar
[macOS issue](https://github.com/supabase/supabase/issues/51027) is corroborating
context, not proof of the Windows cause. A CLI upgrade, wrapper intercepting
Docker commands or modification of existing container internals was not attempted.

### Approved orchestration change

Replace only Bayframe's local service orchestration with one project-owned Docker
Compose definition, using the existing Docker platform and the same four service
images (PostgreSQL, Auth, PostgREST and Kong), configuration and credentials.
Retain the existing `db:start` / `db:stop` entry points as the sole normal workflow.
This changes orchestration ownership; it does not change accepted application,
authentication or business architecture. The owner approved this change before
implementation; the following records its bounded scope.
Docker's [Compose port specification](https://docs.docker.com/reference/compose-file/services/#ports)
supports explicit host addresses and its
[external-volume declaration](https://docs.docker.com/reference/compose-file/volumes/#external)
fails when an existing volume is missing. Neither establishes runtime success here.

- Publish PostgreSQL as `127.0.0.1:55422:5432` and `[::1]:55422:5432`, and Kong as
  `127.0.0.1:55421:8000` and `[::1]:55421:8000`. Keep Auth and PostgREST internal;
  retain the application's explicit IPv4 loopback binding. Validate Docker's
  actual dual-loopback support before declaring these mappings successful.
- First restore engine availability, then inventory only selected image, mount,
  label, network and port fields. Privately preserve and compare existing service
  configuration and credentials without printing them. Declare existing named
  volumes external by their verified names; fail if any are missing. Never create
  a substitute database volume, initialize a new database or run a reset/seed.
- Before cutover, verify the existing database identity/data summary, migration
  journal and credential continuity without exposing row contents or secrets.
  Stop only verified Bayframe containers. Never attach the same PostgreSQL volume
  to two running database processes. Keep the previous stopped containers and
  existing configuration available until acceptance; resolve name conflicts in
  the reviewed Compose definition, not by deleting persistent resources.
- Add a small startup check of actual project publications, failing for absent
  required services, unexpected project ports, empty/wildcard/non-loopback host
  addresses or inspection failure. Cover those failures with focused tests and
  check Windows listeners independently. Suppress credential-bearing service
  summaries; never report ready on intended configuration alone.
- Reconcile all affected callers: `scripts/db/local.mts` relies on the fixed
  database container name and project label; `scripts/auth/configure.mts` obtains
  credentials from CLI status. Preserve their ownership/credential checks while
  adapting them to the new workflow. Review package scripts, the prepared CI
  startup path, browser-server startup and both setup guides together. Do not
  retain a competing CLI startup or silently replace stored credentials. Verify
  administrative execution and Auth key discovery against the retained local
  credentials; include the hard-coded PostgREST container check and all database
  setup/verification callers in that compatibility review.
- Verify loopback health, protected staff access and the existing synthetic
  owner-review journey, then one normal stop/start cycle. Compare data, volume and
  credential continuity across it. Repeat checks against the host's own assigned
  non-loopback IPv4/IPv6 addresses. No off-host probes or isolation guarantees.
  Obtain authorization before any test that creates/deletes databases or changes
  fixtures unless the exact operation is already covered by the resumed scope.
- Rollback: stop only the replacement services, preserve every external volume
  and credential, and retain/restore the previous service configuration. The old
  workflow is not a contained fallback: leave it stopped unless separately
  authorized for diagnosis. Stop on missing credentials/volumes, unexpected data
  differences, unrelated resource ownership, unsupported bindings or health failure.

### Executed implementation and acceptance — 22 October 2026

- `compose.yaml` uses the same pinned four images and existing external database
  volume/network. One-time `db:adopt` validates the source project, imports its
  configuration and required secrets into ignored `.auth/local-stack/`, then
  retains original containers stopped under `-before-bf017` names. No source
  volume, data, environment or credential was deleted, reset, reseeded or rotated.
- `db:start` and `db:stop` now use Compose; `db:check` checks actual publications,
  PostgreSQL readiness and Auth health. `start` and `dev` run this guard and bind
  the app to `127.0.0.1`. Checks reject missing/stopped/extra services, wrong project
  labels, wildcard/empty/non-loopback/duplicate/missing publications and changed
  imported images, environment, commands, entrypoints or health/user settings.
  A failed post-start check stops this Compose project while preserving its
  containers and volume. An interrupted import reuses byte-identical private
  files and refuses to overwrite mismatches.
- Observed Docker requests and actual publications: database `5432/tcp` only at
  `127.0.0.1:55422` and `[::1]:55422`; Kong `8000/tcp` only at
  `127.0.0.1:55421` and `[::1]:55421`. Auth/PostgREST have no host publications.
  Windows listeners match those four service endpoints plus `127.0.0.1:3000`.
  There were no wildcard listeners on the three relevant ports.
- Before and after the normal stop/start cycle, TCP connections succeeded to all
  three ports over IPv4 loopback and both service ports over IPv6 loopback. App
  IPv6 was unavailable as intended for its IPv4-only listener. No connections
  succeeded to any of the three ports via the host's six assigned preferred
  non-loopback addresses (four IPv4 and two scoped IPv6), using 1.5-second bounds.
  No other machine, public address, router or external network was probed.
- Container-local PostgreSQL readiness and Auth HTTP 200 passed; after restart,
  application root/login and Auth health on both loopbacks returned HTTP 200.
  HTTP status alone is not authorization evidence: the live permission and
  browser denial cases below establish the protected-access behaviour. Configuration
  equality checks compare actual containers and rendered Compose definitions with
  the preserved source. Private fingerprints of the complete `app`/`drizzle`/`auth`
  dump, database identity, role/password state, volume identity, `.env.local` and
  demo credential file matched immediately across cutover. Browser tests then
  intentionally added synthetic workflow history. A new post-test baseline
  matched across `db:stop` → `db:start`; no database reset or reseed was used.
- Lint, standalone typecheck, 117 unit tests in 12 files, 12 live Auth/permission
  cases, production build and all 19 existing browser cases passed. Focused
  validation includes unsafe IPv4/IPv6 bindings, configuration/secret changes,
  dollar escaping, safe interrupted-import retries and project-only stop after
  failed startup. Database-creating verification/integration suites were not run:
  no schema/domain code changed and those operations were outside this phase's
  preservation-only runtime checks. Browser checks exercised actual PostgreSQL
  and the synthetic owner-review journey through handover.
- Review corrections addressed generated-file mounts, literal-dollar handling,
  incomplete-import retries and stopping services after a failed binding check.
  No unresolved implementation defect remains from that review. Private files,
  instructions and outputs remain ignored/untracked; the index remains empty.
  No Git mutation, host configuration change, deployment or paid provisioning.
  Final whitespace checks, 42 local Markdown file-target checks and comparison
  against known private environment values passed; no private value appeared in
  the 14 proposed public files.
- Starting the previously unavailable Docker Desktop resumed another project's
  existing containers through their restart policies. No commands targeted that
  project's services/configuration/volumes. This platform-start side effect is
  separate from Bayframe's scoped Compose stop/start cycle.

Limits: evidence establishes local publication and host-origin behaviour on this
machine, not off-host isolation or a production security guarantee. Fresh-machine
and Linux CI import paths were updated but not executed remotely. Private files
must be preserved with the volume; POSIX file modes do not prove Windows ACLs.
No release preparation or deployment follows from these checks.

Next action: owner reviews/commits the explicit public diff and performs BF-018
read-only acceptance of the committed local demonstration; do not begin release
or deployment work.

## BF-013 frontend redesign and evidence

The approved redesign replaces the stacked prototype page with a schedule-first
workspace and separate work-order, resource, absence and manager-history views.
The paired resource timeline and detailed table remain. Booking rows show actual
bay/technician assignments; job sheets group vehicle context, tasks, authorization
and immutable estimate versions. Customer entry, sign-in, request and decision
flows share the implemented [design system](docs/design-system.md).

The database schema, transaction services, domain policies and permission
projections are unchanged. Presentation consumes existing work capabilities.
Named validation errors now connect to fields; failed sign-in retains email.
Cross-view record links wait for streamed targets before focusing them. Issued
links have an explicit copy-before-refresh action. Customer success feedback,
short estimate tables, narrow navigation and 200% text clipping were corrected
following browser evidence. The mobile job selector uses native controls.

Executed on 21 October 2026:

| Check | Verified result |
| --- | --- |
| Frozen lockfile installation | Passed; pinned package graph preserved |
| ESLint and standalone TypeScript | Passed |
| Unit suite | 60 passed in eight files |
| Migration / ACL verifier | Eight hashes; second application unchanged; 26 foundation rejection cases and platform/runtime boundaries passed |
| Real PostgreSQL integration | 10 passed; 100 attempts yielded one confirmation and 99 controlled conflicts, with the correct active pair |
| Live authentication | 11 passed, including scoped permissions and denied access |
| Production build | Passed for every application route |
| Chrome browser suite | 18 passed; complete request → allocation → work → rejection/revision/approval → completion → handover plus permission/focus/recovery tests |
| Responsive / text sizing | Ten surfaces at 320, 390, 768 and 1440px plus 200% root text size; no document overflow in checked cases |
| Long persisted data | Contact 120 characters, registration 20, task 500; retained after reload and readable on narrow job sheets |
| Keyboard | Skip link, visible focus, scrollable timeline, native mobile navigation and job selection, record/task fragment focus passed |
| Failure recovery | Invalid absolute time and connection failure retain values and focus actionable errors; an isolated missing-database probe rendered the staff error/retry view without changing real data; normal view restored afterward |
| Visual review | Seven material corrections scored resolved in a bounded confirmation review |

Representative local evidence is in ignored `output/playwright/redesign/`:
`schedule-allocated-*`, `work-selected-*`, `decision-issued-*`,
`decision-accepted-*`, the ten-surface matrix, long-context and failure captures.
Forty initial viewport samples recorded zero layout-shift sum; ten console
summaries recorded zero errors. Intentional text-resize movement is recorded
separately. These are local observations, not session-window CLS, field metrics,
measured improvements or a performance guarantee. Expected console errors from
the isolated missing-database probe are separate from the successful-view samples.

The production app remains at http://127.0.0.1:3000 on loopback for owner review.
The isolated failure-probe server was stopped. Existing synthetic database data
and volumes are preserved; test journeys append synthetic history. The index is
empty. Source, docs, dependencies and font licence are unstaged for manual review.
The pre-existing Material UI/Emotion/shadcn package additions were retained;
only the necessary streaming style integration dependencies were added.

Limitations: browser evidence is desktop Chrome with viewport and text-size
emulation, not physical devices, actual browser zoom, screen-reader validation,
full accessibility conformance or real garage-operator validation. The existing
Material UI version is a prerelease. Remote CI, deployment, production operations,
rate limits, backups and physical-overrun policy remain outside this stage.
Docker's previously observed all-interface database exposure remains unresolved;
loopback application binding does not establish database LAN isolation.

Next task: owner reviews the running synthetic application and explicit public
diff, then stages/checks/commits only if accepted. No release or further product
phase is authorized by this closeout.

## BF-012 prototype acceptance and current evidence

The source was audited against all MVP rows in [product requirements](docs/product-requirements.md),
using the accepted scope in [workflow.md](docs/workflow.md). Regression tests
reproduced four defects before correction: pending replacement drafts refused
planning tasks; UI controls offered completion without current approval; manager
history hid record/task references; revised decision links opened in the same tab
left the previous estimate displayed. No dependency, architecture or schema change
was required. The shared work policy now governs mutations and safe UI flags;
technicians receive no estimate/customer/audit records. New task events include
their task ID in existing details; previous events are not rewritten. Preview and
decision tokens remain paired, with fragment changes and stale responses handled.

| MVP requirement | Current completion evidence |
| --- | --- |
| Request | Validated real transaction, no allocation; browser preserves invalid input |
| Availability | Direct assertions before/after request, allocation, absence, adjacency and cancellation |
| Confirm | Atomic bay/technician pair, booking state and audit; integration/browser |
| Conflict | SQL exclusion, real lock wait, races and 100 competing confirmations |
| Cancel | Atomic release, retained history and browser cancellation |
| Reschedule | Successful replacement/adjacency, injected rollback and races |
| Start | Unique check-in and explicit Start before approval; completion remains unavailable |
| Progress | Assignment/current approval checks, permitted-action matrix and pending draft task planning |
| Estimate | Integer arithmetic/rounding, versioning and immutable issued SQL snapshots |
| Customer decision | Rejection → revision → acceptance, version/expiry/replay checks and revised same-tab link |
| Complete/close | Approved completed tasks required; handover and release transaction verified |
| History | Manager record/task references, actor/time; integration attribution and browser focus links |

After corrections, lint, standalone typecheck, 56 unit tests in seven files,
10 real-PostgreSQL integration cases, 11 actual Auth/runtime cases, production
build and two expanded Chrome browser journeys pass. The eight-migration verifier
also passes, including unchanged second application, platform ownership,
26 foundation rejection cases and privilege/API checks. All disposable databases
were removed. The latest 100-attempt diagnostic produced one confirmation,
99 controlled conflicts and two active allocations with pool max five; it remains
correctness evidence rather than a throughput benchmark.

The browser journey explicitly starts work, rejects the first estimate, revises
a pending scope, adds its task, opens the replacement link in the same tab,
accepts, completes both tasks as assigned technician and records handover. History
links focus the actual task. Desktop/mobile screenshots are in local
`output/playwright/`; both viewports have no document overflow. The standalone
server is bound to 127.0.0.1:3000 for review. Existing production/network/physical
occupancy limitations still apply. No commit, push, remote CI or deployment ran.

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
