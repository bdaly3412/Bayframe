# ADR-001: Modular monolith

Status: accepted by the project owner on 20 October 2026. Decision owner: project owner.

## Context

Bayframe has one developer/technical owner, one initial workshop and a short
portfolio delivery window. Booking and repair workflows share transactional data,
and the application must remain straightforward to operate and maintain.

## Problem

Choose application boundaries that preserve clear domain logic without adding
deployment and distributed-system work unrelated to current requirements.

## Considered alternatives

| Option | Benefit | Cost |
| --- | --- | --- |
| Modular Next.js monolith | One codebase/deployment; direct transactions; shared types | Framework coupling and need for disciplined boundaries |
| Separate frontend/backend | Independent API lifecycle and runtime choice | Two deployments, contracts and auth integration surfaces |
| Microservices | Independent scaling/ownership for established boundaries | Distributed consistency, networking, observability and operational burden |

## Decision

Use one Next.js application with feature-oriented domain services and scoped
persistence. Keep React/framework handlers thin. Avoid service abstractions or
HTTP APIs without an actual caller.

## Reasons

One deployment and one transactional database suit the initial workflow. Domain
modules preserve understandable boundaries without distributed transactions.

## Consequences

Changes share a release and process. Feature boundaries and tests need review.
Domain services should avoid unnecessary React dependencies so they remain
testable and could be extracted if a real boundary later emerges.

## Risks

Handlers can accumulate business logic; shared modules can become miscellaneous
helpers; client imports can expose server-only dependencies. Review module
dependencies and actual data/transaction paths as implementation grows.

## Revisit conditions

A demonstrated independent consumer, runtime constraint, scaling bottleneck or
team boundary justifies extraction. Portfolio appearance alone does not.

## Acceptance discussion

Reviewed in BF-002 and accepted by the project owner on 20 October 2026:

- One Next.js App Router application on the Node.js runtime; no Edge runtime or
  separately deployed API. No required independent API consumer is identified.
- Feature services own business operations; framework entry points validate and
  authorize, then call those services. Persistence joins the service transaction.
- Bootstrap uses a supported Node.js 24 LTS patch, pnpm, strict TypeScript, a
  `src/app` directory, `@/*` imports, Tailwind CSS, ESLint and Vitest. Resolve and
  pin compatible exact versions during BF-003; do not install future features.
- First route is a restrained public project-status page with synthetic content.
  No dashboard, auth, database client or empty feature-service scaffolding in
  BF-003. Add modules when their first behaviour requires them.

Owner acceptance records the architecture choice. It does not establish runtime
verification or a production guarantee.
