# Roadmap and project state

Updated: 20 October 2026.

## Current state

The checkout started clean on `main` at `66373eb` on 20 October 2026. The owner
accepted ADR-001 through ADR-003 and authorized BF-003 only. BF-002 is complete.
BF-003 implementation and local verification are complete and ready for owner
review: one public status page, pinned tooling and a rendering smoke test.
Changes remain unstaged and uncommitted. No remote state was changed or rechecked
in BF-003. Repository history changes remain owner-controlled.

The initial planning window is 20 October–16 November 2026, with a provisional
72–100 focused-hour budget. Re-estimate after the first working database and
authentication slice; do not claim tracked time retroactively.
Actual active time has not been recorded for BF-002 or BF-003.

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
| BF-003 / Review | Bootstrap Next.js, strict TypeScript, pnpm and Vitest; reproducible engineering baseline | Accepted BF-002; owner authorized BF-003 | 2–3h estimated; actual not recorded / Engineering, owner review | Clean frozen install, development route, lint, standalone typecheck, 1 rendering test, production build and desktop/mobile browser checks passed; manual commit outstanding |
| BF-004 / Ready | Interval semantics; establish back-to-back scheduling behaviour | Owner reviews BF-003 and separately authorizes BF-004 | 1–2h / Engineering | Overlap, containment, adjacency, symmetry and invalid-interval unit tests pass |
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
- No garage-operator validation, database runtime/migration tests, automated
  end-to-end suite, remote CI or deployment evidence exists yet.
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

Owner reviews the BF-003 diff and stages/commits only the explicit public files.
Then authorize BF-004 interval semantics in a fresh task. BF-004 is ready but has
not been started or authorized. Database/auth work remains in later stages.

Suggested owner commit message: `feat: bootstrap application foundation`.

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
