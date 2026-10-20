# Testing and evidence strategy

Status: planned; no test suite exists. Updated: 20 October 2026.

## Principles

Verify business outcomes and important failure modes. Compilation, mocked
database tests, HTTP 200 and process exit codes alone do not prove the workflow.
Record commands, assertions, environment, failures and known limits. Do not invent
coverage, performance results or asynchronous progress.

| Layer | Planned tool | Required evidence |
| --- | --- | --- |
| Unit | Vitest | Interval semantics, state transitions, permission decisions, estimate arithmetic/version rules |
| Integration | Vitest + real PostgreSQL | Constraints, transactions, privileges, contention, rollback and migration behaviour |
| Browser | Playwright | Synthetic user journey, direct denial outcomes, loading/error states and usable responsive screens |
| CI | GitHub Actions | Reproducible install, lint, typecheck, unit/integration tests, migrations, build and selected browser tests |

## Scheduling integration cases

1. Same resource and overlapping active intervals cannot coexist.
2. Adjacent half-open intervals and independent resources are allowed.
3. Two valid bookings contending for a shared bay or technician produce one
   confirmation and one controlled conflict, with consistent final records.
4. Two confirmations of the same booking against different resources cannot
   produce duplicate active reservations or duplicate confirmation events.
5. Cancellation releases capacity without deleting history; confirm-versus-cancel
   and confirm-versus-reschedule races cannot produce inconsistent state.
6. A forced failure after the first allocation or before the audit event rolls
   back all confirmation changes. A failed reschedule keeps original allocations.
7. Requests create no allocations. Availability-window/capability violations fail.
8. Wrong customer/vehicle/workshop relationships and invalid intervals are rejected.
9. Invalid state transitions fail without partial records or misleading audit events.

Use genuinely independent database connections/transactions with coordinated
start points. A single shared connection serializes work and cannot establish
the intended contention behaviour. Assert final state as well as responses.

## Contention demonstration

After deterministic two-connection tests, submit 100 valid competing requests for
one resource/interval on a clean fixture. In a healthy successful run, expect one
success, 99 controlled conflicts, zero unexpected errors and one active allocation.
The safety invariant remains at most one allocation even under failures, but
zero successes is not evidence that the intended workflow succeeded.

Record submitted/completed attempts, successes, conflicts, unexpected errors,
active allocation count, booking/audit consistency, timings, database version,
pool size, timeouts, hardware and start coordination. Report configured versus
actual concurrent DB activity: 100 submitted attempts do not imply 100 concurrent
connections. Separate correctness evidence from throughput claims. Extend to
mixed resources/workloads before making broader performance statements.

## Work orders, estimates and access

Test permitted/forbidden transitions, assignment restrictions, immutable issued
versions, superseded/expired decisions, concurrent issue-versus-approval,
duplicate decision replay and monetary bounds/rounding. Verify atomic decision
and audit persistence. Cover the access matrix in [security.md](security.md),
including paths that bypass the visible UI.

Test workshop timezone conversion around UK spring/autumn transitions against a
defined ambiguity policy. Interval arithmetic on UTC instants alone does not
prove correct local-time input handling.

## Browser journey

Submit request → authorized staff confirmation → conflicting request rejection →
technician progress → estimate issue → explicit customer decision → permitted
completion/handover. Include cancellation release, authorization denials and
repeat/stale submissions. Inspect screenshots for key states and keyboard/mobile
usability; page rendering alone is insufficient.

## Isolation, migrations and CI

Use dedicated disposable test databases with synthetic fixtures. Test setup must
fail closed if given an unrecognized/non-test target; never reset a development,
shared or production database by assumption. Do not issue destructive commands
until the exact operation is authorized.

Apply migrations to an empty test database and inspect expected constraints,
extensions and grants. For later schema changes, test upgrades from the supported
previous state as well. Keep CI PostgreSQL compatible with target capabilities.
Build/lint/typecheck are separate checks; verify framework behaviour for the
selected version. Remote CI is only verified after an actual run is inspected.

## Current execution record

No application, migration, integration, browser or benchmark checks have run.
Documentation checks for the foundation are recorded in [ROADMAP.md](../ROADMAP.md).
Runnable package commands will be documented only after bootstrap establishes them.
