# ADR-002: PostgreSQL resource scheduling

Status: accepted by the project owner on 20 October 2026. Decision owner: project owner.

## Context

Independent confirmations may observe the same free bay/technician before either
writes. Both requests can be individually valid while their combined result
double-books a resource. Correctness must survive all authorized write paths.

## Problem

Prevent overlapping active allocations and keep booking state, allocations and
audit events atomic under confirmation, cancellation and rescheduling races.

## Considered alternatives

| Option | Benefit | Cost/limitation |
| --- | --- | --- |
| Application availability check only | Simple user feedback | Check-then-write race; no final protection |
| Explicit resource locks | Can serialize decisions | Every writer must follow the protocol; lock ordering and contention |
| Serializable transactions | Broad anomaly detection | Retry handling required; does not express the domain rule directly |
| Range exclusion plus deliberate transactions/booking locking | Database expresses non-overlap; application coordinates lifecycle | PostgreSQL-specific SQL, extension and real concurrency tests |

## Decision

Use PostgreSQL timezone-aware range overlap with a GiST exclusion constraint per
resource, applying to active unreleased allocations. Use half-open `[start, end)`
intervals and explicit finite, non-empty endpoint constraints. Investigate and
verify `btree_gist` for equality alongside the range operator.

The domain service owns the transaction. Lock/conditionally transition the booking
so it cannot be confirmed twice with different resources. Confirmation allocates
bay and technician, changes state and records audit together. Cancellation marks
allocations released; rescheduling replaces them transactionally, preserving
the old reservation on failure. Preserve history rather than deleting rows.

## Reasons

The non-overlap invariant belongs alongside the authoritative data. Application
checks remain useful for availability and clear feedback, but cannot settle races.
Booking lifecycle coordination handles invariants the exclusion constraint does
not cover. Explicit locking remains part of the solution, not a rejected tool.

## Consequences

Custom reviewed SQL may be needed alongside Drizzle schema declarations. Tests
must use real PostgreSQL and independent connections. Conflict handling must be
separate from infrastructure failures. Availability and state rules remain ours.

## Risks

Incorrect active predicates, empty/unbounded ranges, missing resource ownership,
inconsistent lock ordering and unsafe retries can invalidate expected behaviour.
Planned intervals do not solve actual vehicle overruns or bay occupancy while
awaiting approval. Those business rules remain open.

## Revisit conditions

Requirements for phase scheduling, multi-capacity resources, a different database
or measured contention justify re-evaluation. Do not replace database guarantees
with frontend checks to improve apparent responsiveness.

## Acceptance discussion

Reviewed in BF-002 and accepted by the project owner on 20 October 2026:

- PostgreSQL in local Supabase is the one local application/auth database. Use
  real matching PostgreSQL capabilities in integration checks; no SQLite stand-in.
- Drizzle owns application schema migration history, including custom SQL for
  `btree_gist`, finite/non-empty ranges, partial exclusion and integrity rules.
  Supabase owns its platform/auth objects. Do not run two migration histories
  against the same application tables.
- Use Drizzle's `node-postgres` (`pg`) driver when persistence is introduced.
  Keep all transaction operations on the same connection. Connection pooling
  for deployment remains subject to the actual target and transaction tests.
- Lock the booking row before confirmation/cancellation/rescheduling decisions;
  use a consistent resource order. Allocate both resources, transition state and
  append audit in one transaction. Released history remains in place; a failed
  replacement rolls back to the original reservation.
- Interpret intervals as absolute instants with `[start, end)` boundaries.
  Retain workshop `Europe/London` separately for the initial synthetic fixture.
  Local-time ambiguity/overrun policies remain requirements for BF-009, not
  assumptions to bury in database defaults.
- Healthy contention evidence requires one success, controlled conflicts and
  consistent final records. Also test same-booking/different-resource races and
  rollback after the first allocation. Extension/version support must be tested.

BF-003 installs no database tools or schema. BF-005 establishes infrastructure;
BF-006 introduces only workshop, staff and resources. Allocation/booking SQL is
part of BF-009 after its detailed issue is approved. This accepted design is not a claim
that any database guarantee has been implemented.

Reference: [PostgreSQL range types and constraints](https://www.postgresql.org/docs/current/rangetypes.html).

Implementation references: [Drizzle PostgreSQL drivers](https://orm.drizzle.team/docs/get-started-postgresql),
[custom SQL migrations](https://orm.drizzle.team/docs/kit-custom-migrations).
