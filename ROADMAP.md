# Roadmap and project state

Updated: 20 October 2026.

## Current state

Documentation foundation committed locally as `abf957f`. Application
implementation has not started. Remote publication is not verified.
Technical ADRs are proposed and require owner review. Repository history changes
remain owner-controlled.

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
| BF-002 / Ready | Review three ADRs and resolve bootstrap assumptions; avoid competing architectures | BF-001 review | 1–2h / Owner review | ADR statuses explicitly decided; migration owner, DB access, runtime and first schema scope agreed |
| BF-003 / Backlog | Bootstrap Next.js, strict TypeScript, pnpm and Vitest; reproducible engineering baseline | BF-002 and phase approval | 2–3h / Engineering | Clean install, development route, lint, typecheck, unit test and build actually succeed; versions/commands documented |
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
  A subsequent push failed with an access error; remote publication remains
  blocked pending authorized repository access. Application code/tests are absent.
- Shared ignore rules cover dependencies, generated builds, local credentials,
  test results and artifacts. Local setup does not change application readiness.

## Next action

Owner commits the ignore-policy update, resolves repository access, then
authorizes BF-002: discuss the proposed ADRs and close bootstrap choices.
Application scaffolding is not yet authorized.

Suggested owner commit message: `chore: add local artifact ignore policy`.
