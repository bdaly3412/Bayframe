# ADR-002: PostgreSQL resource scheduling

Status: proposed. Date: 20 October 2026. Decision owner: project owner.

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

## Proposed decision

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

Confirm release semantics, interval/timezone policy, migration ownership and the
healthy contention-test outcome. Test actual extension/version support before
accepting the implementation.

Reference: [PostgreSQL range types and constraints](https://www.postgresql.org/docs/current/rangetypes.html).
