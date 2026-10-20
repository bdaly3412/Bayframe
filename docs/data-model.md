# Data model

Status: logical proposal; no SQL schema or migration exists. Updated: 20 October 2026.

```mermaid
erDiagram
    WORKSHOP ||--o{ STAFF : employs
    WORKSHOP ||--o{ RESOURCE : owns
    WORKSHOP ||--o{ BOOKING : receives
    CUSTOMER ||--o{ VEHICLE : owns
    CUSTOMER ||--o{ BOOKING : requests
    VEHICLE ||--o{ BOOKING : concerns
    BOOKING ||--o{ ALLOCATION : reserves
    RESOURCE ||--o{ ALLOCATION : allocated
    BOOKING ||--o| WORK_ORDER : creates
    WORK_ORDER ||--o{ JOB_TASK : contains
    WORK_ORDER ||--o{ ESTIMATE : has
    ESTIMATE ||--o{ ESTIMATE_LINE : contains
    ESTIMATE ||--o| APPROVAL : receives
    WORKSHOP ||--o{ AUDIT_EVENT : records
```

Ownership shown here is an initial simplification; contact/authorizer and vehicle
ownership-transfer semantics must be agreed before customer workflows.

## Entities and integrity requirements

| Entity | Important fields and constraints to design |
| --- | --- |
| Workshop | UUID, name, validated IANA timezone |
| Staff | UUID, workshop, auth-user UUID, role, active flag; unique workshop/user membership |
| Resource | UUID, workshop, bay/technician type, name, optional staff link; decide staff-link/type consistency |
| Customer | UUID, workshop ownership, required contact fields defined by workflow; no assumed global email uniqueness |
| Vehicle | UUID, customer/workshop relationship, registration and descriptive fields; define normalization/ownership changes |
| Booking | UUID, workshop, customer, vehicle, state and requested interval; related entities must belong together |
| Allocation | UUID, booking, resource, start/end instants, released timestamp; overlap exclusion for active rows |
| Work order | UUID, unique booking, state and audit metadata |
| Job task | UUID, work order, description and validated state |
| Estimate | UUID, work order, version, lifecycle, currency/tax/total snapshot, issue/expiry metadata; unique work-order/version |
| Estimate line | UUID, estimate, description, quantity, integer minor-unit amounts and explicit tax treatment |
| Approval | UUID, exact estimate version, decision, actor mechanism and decision time; at most one decision per version |
| Audit event | UUID, workshop, entity/action, actor and timestamp; typed entity references to be designed |

Audit events must represent booking and estimate events as well as work-order
events. Requiring a work-order ID for every event would prevent recording a
booking request before a work order exists. Decide reference constraints before
implementing the audit schema; do not use an unchecked generic entity ID by default.

## Scheduling constraints

- Allocation resource and booking belong to the same workshop. Use appropriate
  composite keys/foreign keys where necessary; independent foreign keys alone
  do not enforce this relationship.
- Non-null, finite endpoints and `start_at < end_at`; timezone-aware timestamps.
- Proposed exclusion: resource equality plus overlap of
  `tstzrange(start_at, end_at, '[)')`, limited to rows with `released_at IS NULL`.
- Verify `btree_gist` availability and the exact deployed PostgreSQL version.
  Review actual SQL rather than assuming the ORM emitted the constraint.
- Decide required-resource uniqueness per active booking. The overlap constraint
  alone does not prevent one booking being confirmed against different resources.
- Requests allocate nothing. Confirmation creates all required allocations and
  changes booking state with its audit event in one transaction.
- Release preserves history. Cancel/reschedule must not delete allocations just
  to free capacity. Failed replacement restores the prior state via rollback.
- Availability windows, absence exceptions and capability matching are additional
  rules; non-overlap alone does not prove an allocation is operationally valid.

## Time, money and versioning

Use workshop-local time for display/input and absolute instants for allocation.
PostgreSQL timezone-aware timestamps do not retain the workshop's IANA timezone;
store it separately. Specify DST ambiguity/nonexistence handling at the boundary.

Money uses integer minor units with currency. Validate quantities, numeric bounds,
tax and deterministic rounding. Issued/approved estimate lines and totals cannot
be edited; changes create a new version. Decision writes must atomically reject
superseded/expired versions and resolve duplicate submissions without creating
multiple authorizations. Design a database-supported immutability strategy before
claiming it is enforced.

## State, deletion and migrations

Domain services own permitted transitions. Constraints enforce valid values,
required relationships and critical uniqueness; they do not replace the service
state machine. Deliberate locking/conditional updates handle concurrent changes.

Initially restrict deletion of referenced operational history. Define retention,
anonymization and authorized correction separately; do not cascade-delete
approvals or audit history accidentally. Decide indexes from actual access paths.

Proposed migration owner: Drizzle. Version custom SQL alongside generated SQL.
Verify clean-database application, required constraints, privileges and supported
upgrade paths in disposable databases. No reset or production migration is
authorized by this document.
