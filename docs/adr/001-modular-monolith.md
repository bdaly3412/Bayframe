# ADR-001: Modular monolith

Status: proposed. Date: 20 October 2026. Decision owner: project owner.

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

## Proposed decision

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

Confirm that a separately deployed API has no current required consumer and that
the owner accepts Next.js as both interface host and server application runtime.
No implementation or production guarantee is established by this proposal.
