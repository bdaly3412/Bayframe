# Roadmap and project state

Updated: 20 October 2026.

## Current state

Documentation and local ignore policy are committed through `3d6ebba`; the remote
`main` was verified at the same commit on 20 October 2026. Application
implementation has not started. BF-002 architectural review is complete; the
three ADRs contain concrete recommendations and remain proposed for owner
acceptance. Repository history changes remain owner-controlled.

The initial planning window is 20 October–16 November 2026, with a provisional
72–100 focused-hour budget. Re-estimate after the first working database and
authentication slice; do not claim tracked time retroactively.
Actual active time has not been recorded for this documentation phase.

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
| BF-002 / Review | Review three ADRs and resolve bootstrap assumptions; avoid competing architectures | BF-001 complete | 1–2h estimated; actual not recorded / Owner review | Concrete runtime, migration, access and first-schema recommendations recorded; owner acceptance outstanding |
| BF-003 / Ready | Bootstrap Next.js, strict TypeScript, pnpm and Vitest; reproducible engineering baseline | Owner accepts BF-002 ADRs and authorizes BF-003 | 2–3h / Engineering | Clean install, development route, lint, typecheck, unit test and build actually succeed; versions/commands documented |
| BF-004 / Backlog | Interval semantics; establish back-to-back scheduling behaviour | BF-003 | 1–2h / Engineering | Overlap, containment, adjacency, symmetry and invalid-interval unit tests pass |
| BF-005 / Backlog | Local database and migration baseline; reproduce persistence | BF-002, Docker engine available | 3–4h / Engineering | Migrations apply to empty disposable DB; DB version/extension availability recorded; no remote DB changed |
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
- No garage-operator validation, runtime tests, migration tests, browser tests,
  remote CI or deployment evidence exists yet.
- The owner committed the documentation foundation as `abf957f` on 20 October.
  The later ignore-policy commit is `3d6ebba`; read-only remote verification found
  the same SHA on `refs/heads/main`. The prior access blocker is resolved for that
  publication. Application code/tests are absent.
- Shared ignore rules cover dependencies, generated builds, local credentials,
  test results and artifacts. Local setup does not change application readiness.
- BF-002 reviewed official Next.js, PostgreSQL, Drizzle and Supabase documentation
  and specified the baseline in ADR-001 through ADR-003. These are design choices
  awaiting acceptance, not runtime/migration/security evidence.

## Next action

Owner reviews/commits the architecture recommendations, then accepts ADR-001
through ADR-003 and authorizes BF-003 bootstrap. No application scaffolding was
performed in BF-002. BF-003 scope and checks are below.

Suggested owner commit message: `docs: clarify architecture and bootstrap scope`.

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
