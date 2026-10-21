# Bayframe

Workshop operations and resource scheduling for independent automotive garages.

Bayframe is a portfolio engineering project focused on reliable booking,
transactional resource allocation, work orders and versioned customer approvals.
The initial release targets one workshop.

## Current status

Local demonstration, 21 October 2026. Staff sign-in, scoped resource access,
appointment requests, transactional bay/technician allocation, work orders,
immutable estimate versions and restricted customer decisions are implemented.
ADR-001 through ADR-003 remain accepted. Local unit, database and browser evidence
is recorded in the roadmap; prepared CI has not been run remotely.
Prototype acceptance also covers rejection/revision paths, safe work controls,
task-level history and revised customer links in the same tab.
The frontend uses a shared allocation-sheet design with separate schedule, job-sheet, resource, absence and history destinations. Customer requests and decisions use the same typography and controls. See the [implemented design system](docs/design-system.md).
Local PostgreSQL and migrations are documented in [database setup](docs/database.md).
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
| [Demonstration guide](docs/workflow.md) | Run commands, complete journey, accepted policies, checks and limits |
| [Stack](STACK.md) | Pinned foundation, later selections and dependency policy |
| [Product requirements](docs/product-requirements.md) | Users, workflow, acceptance criteria, scope and open questions |
| [Architecture](docs/architecture.md) | Application boundaries and transaction responsibilities |
| [Data model](docs/data-model.md) | Relationships, invariants and migration requirements |
| [Security](docs/security.md) | Identity, permissions, customer links and data protection |
| [Testing strategy](docs/testing-strategy.md) | Required correctness, concurrency and browser evidence |
| [Interval semantics](docs/intervals.md) | Absolute instants, half-open boundaries and runtime validation |
| [Local database](docs/database.md) | Isolated Supabase setup, Drizzle migrations and real-database verification |
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

For local persistence and its checks, follow [the database instructions](docs/database.md).
For the complete application and synthetic login setup, follow [the demonstration guide](docs/workflow.md).
Docker's Linux engine and real PostgreSQL were verified on 20 October 2026;
engine readiness must still be checked before each database session.

All future public fixtures and demonstration data must be synthetic.

## Limitations

Business assumptions have not been validated with garage operators. Physical bay
occupancy beyond planned intervals, production operations and deployment remain
unverified. Milestone dates remain planning targets. Read [the current task board](ROADMAP.md#task-board)
for executed checks and remaining work.
