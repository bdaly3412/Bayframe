# Interval semantics

Implemented in `src/scheduling/interval.ts`, independently of the application
framework and persistence. This follows [ADR-002](adr/002-postgresql-scheduling.md).

`Interval` has readonly numeric `start` and `end` endpoints, measured in Unix
epoch milliseconds: absolute instants relative to 1970-01-01T00:00:00Z, not local
clock times. Negative and fractional values are accepted. No parsing, coercion,
rounding or timezone conversion occurs. JavaScript number precision applies;
database precision and serialization mapping must be verified when introduced.

`createInterval(start, end)` requires finite numbers and `start < end`, returning
a frozen object. Empty/reversed intervals, `NaN`, infinities and non-number
endpoints throw `RangeError`. Strings and `Date` objects are not accepted as
endpoints. The typed API expects interval objects; it is not a general payload
parser.

Boundaries are half-open `[start, end)`: start is included and end is excluded.
`overlaps(left, right)` validates both intervals, including structurally supplied
objects, before comparing `left.start < right.end && right.start < left.end`.
Invalid endpoints throw even when a comparison could otherwise short-circuit.
Overlap is symmetric. Containment and identical intervals overlap; disjoint
intervals do not. `[0, 10)` and `[10, 20)` are adjacent and do not overlap in
either argument order. The API exposes construction and overlap only.

Tests in `src/scheduling/interval.test.ts` cover those relations, shared endpoints,
negative/fractional values and invalid endpoints at both entry points. Run
`pnpm test` from the repository root.

These are in-memory semantics, not resource allocation or concurrency guarantees.
Database enforcement remains future work under ADR-002. Workshop timezone,
ambiguous local-time input and overrun policies remain outside this module.
