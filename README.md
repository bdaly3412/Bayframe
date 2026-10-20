# Bayframe

Workshop operations and resource scheduling for independent automotive garages.

Bayframe is a portfolio engineering project focused on reliable booking,
transactional resource allocation, work orders and versioned customer approvals.
The initial release targets one workshop.

## Current status

Application foundation, 20 October 2026. A minimal Next.js application serves a
public project-status page, with strict TypeScript, linting and a rendering smoke
test. ADR-001 through ADR-003 are accepted. Database schema, authentication,
booking features, CI and deployment have not been implemented.
No production-readiness or performance claims are made.

The intended workflow is:

Appointment request → staff confirmation and resource allocation → work order →
repair progress → estimate → customer decision → completion and handover.

The central scheduling invariant is that a resource cannot have overlapping
active allocations. Availability shown to a user is advisory until a transaction
successfully confirms the booking.

## Project documents

| Document | Purpose |
| --- | --- |
| [Roadmap](ROADMAP.md) | Milestones, local task board, acceptance evidence and next action |
| [Stack](STACK.md) | Pinned foundation, later selections and dependency policy |
| [Product requirements](docs/product-requirements.md) | Users, workflow, acceptance criteria, scope and open questions |
| [Architecture](docs/architecture.md) | Application boundaries and transaction responsibilities |
| [Data model](docs/data-model.md) | Relationships, invariants and migration requirements |
| [Security](docs/security.md) | Identity, permissions, customer links and data protection |
| [Testing strategy](docs/testing-strategy.md) | Required correctness, concurrency and browser evidence |
| [Design system](docs/design-system.md) | Interface principles and accessibility requirements |
| [ADR-001](docs/adr/001-modular-monolith.md) | Accepted modular monolith |
| [ADR-002](docs/adr/002-postgresql-scheduling.md) | Accepted PostgreSQL scheduling design |
| [ADR-003](docs/adr/003-authentication.md) | Accepted managed authentication and application permissions |

## Setup and verification

Use Node.js **24.13.0** and pnpm **11.25.0**. Exact direct dependency versions
are in `package.json`; transitive versions are in `pnpm-lock.yaml`. pnpm uses the
declared Node runtime for scripts, downloading it when needed. This avoids a
different Node version inside a package-manager wrapper. Project settings live
in `pnpm-workspace.yaml`; only the required esbuild and resolver installation
scripts are allowed.

From the repository root in PowerShell:

```powershell
pnpm --version
pnpm install --frozen-lockfile
pnpm exec node --version
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start --hostname 127.0.0.1
```

Expected versions: `11.25.0` and `v24.13.0`. Stop on a version mismatch or failed
command. Open [the local page](http://127.0.0.1:3000) after starting the server;
stop it with Ctrl+C. For development, use `pnpm dev --hostname 127.0.0.1` instead.
The typecheck runs independently of the build; tests run once without watching.
The rendering smoke test uses React DOM's server renderer in Node, with no DOM
simulation. It does not prove scheduling, authentication or database behaviour.

The 19 October environment assessment found Node, pnpm and Docker CLI installed,
but Docker's Linux engine was unreachable. That is a dated observation, not a
current infrastructure guarantee. No Docker or database runtime was checked
during the application bootstrap.

All future public fixtures and demonstration data must be synthetic.

## Limitations

Business assumptions have not been validated with garage operators. Accepted
database/authentication designs have no implementation evidence yet. Milestone
dates remain planning targets. Read [the current task board](ROADMAP.md#task-board)
for executed checks and remaining work.
