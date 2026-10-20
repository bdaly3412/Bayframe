# Bayframe

Workshop operations and resource scheduling for independent automotive garages.

Bayframe is a portfolio engineering project focused on reliable booking,
transactional resource allocation, work orders and versioned customer approvals.
The initial release targets one workshop.

## Current status

Documentation foundation, 20 October 2026. No application, database schema,
authentication, tests, CI pipeline or deployment has been implemented.
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
| [Stack](STACK.md) | Proposed tools, selection status and dependency policy |
| [Product requirements](docs/product-requirements.md) | Users, workflow, acceptance criteria, scope and open questions |
| [Architecture](docs/architecture.md) | Application boundaries and transaction responsibilities |
| [Data model](docs/data-model.md) | Relationships, invariants and migration requirements |
| [Security](docs/security.md) | Identity, permissions, customer links and data protection |
| [Testing strategy](docs/testing-strategy.md) | Required correctness, concurrency and browser evidence |
| [Design system](docs/design-system.md) | Interface principles and accessibility requirements |
| [ADR-001](docs/adr/001-modular-monolith.md) | Proposed modular monolith |
| [ADR-002](docs/adr/002-postgresql-scheduling.md) | Proposed PostgreSQL scheduling guarantees |
| [ADR-003](docs/adr/003-authentication.md) | Proposed managed authentication and application permissions |

## Setup and verification

There is no package manifest or runnable setup yet. Installation, migration and
test commands will be added after they are implemented and executed successfully.
Do not treat examples in planning documents as available commands.

The 19 October environment assessment found Node, pnpm and Docker CLI installed,
but Docker's Linux engine was unreachable. That is a dated observation, not a
current infrastructure guarantee. Versions will be selected and checked during
bootstrap.

All future public fixtures and demonstration data must be synthetic.

## Limitations

Business assumptions have not been validated with garage operators. The stack and
three technical ADRs are proposals. The roadmap is a planning target, not delivery
evidence. Read [the current task board](ROADMAP.md#task-board) before continuing.
