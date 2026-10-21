# Product requirements

Status: local demonstration scope accepted on 21 October 2026. The resolutions
in [workflow.md](workflow.md) supersede the earlier open policy questions below
for this demonstration. Real workshop assumptions remain unvalidated.

## Purpose and evidence boundary

Bayframe coordinates appointments and repairs for one independent automotive
workshop. Its portfolio objective is demonstrable engineering: consistent data,
concurrency-safe allocation, permissions, auditability and reproducible failures.
Garage operating assumptions are unvalidated until supported by actual feedback.

## Users

| User | Required capability |
| --- | --- |
| Manager | Manage schedule, staff/resources, work orders, estimates and audit access |
| Service adviser | Handle requests, confirmations, allocations and estimates |
| Technician | View permitted schedule information and update assigned work |
| Customer | Submit a request and decide a specific estimate version through a restricted flow |

The permission details are owned by [security.md](security.md). Customer access
is distinct from staff authentication.

## MVP workflow and acceptance criteria

| Requirement | Acceptance criteria |
| --- | --- |
| Request appointment | Valid customer/vehicle details and requested time create a request; invalid input is rejected; no resources are reserved |
| Show availability | Candidate times respect configured duration, availability windows and active allocations; displayed availability is not a reservation |
| Confirm booking | Authorized staff reserves one required bay and technician for the configured interval; state, allocations and audit record commit together |
| Reject conflict | Concurrent requests cannot create overlapping active allocations of one resource; expected conflicts are distinct from infrastructure errors |
| Cancel booking | Permitted cancellation changes state and releases allocations atomically while retaining history |
| Reschedule booking | Replacement allocations and booking changes are atomic; failure preserves the original booking and reservation |
| Start work | Check-in creates/starts at most one work order per booking through permitted transitions |
| Record progress | Authorized staff/assigned technicians update permitted tasks and states with actor/time attribution |
| Prepare estimate | Versioned line items, quantities, currency, totals and tax treatment are explicit; issued versions are immutable |
| Customer decision | A valid restricted mechanism records one decision against the exact version; expired, superseded or duplicate/conflicting submissions are controlled |
| Complete and close | Only permitted transitions complete authorized work and record handover; incomplete work cannot be silently closed |
| Inspect history | Authorized staff can trace meaningful transitions without secrets or unnecessary personal data appearing in logs |

## Domain rules

- One workshop initially. Keep ownership explicit without adding SaaS billing or
  multi-branch management.
- A request is not a reservation. Staff confirmation allocates resources.
- Required bay and technician are reserved for the same configured period in v1.
  Phase scheduling is excluded. Capability matching and availability rules need
  explicit definitions before implementation.
- A resource has no overlapping active allocations. Use `[start, end)` semantics;
  reject empty, reversed, null or non-finite allocation endpoints.
- Booking, work order and estimate have separate state machines. Status changes
  must pass domain rules; do not expose unrestricted status-field writes.
- Store absolute instants with timezone-aware timestamps; retain workshop IANA
  timezone and define treatment of ambiguous/nonexistent local times.
- Store money as integer minor units. Validate quantities and arithmetic bounds;
  define rounding and tax before estimate implementation.

## Non-goals

Accounting/invoicing, payments, parts integrations, advanced inventory, fault
diagnosis, native mobile apps, franchises, multi-tenant billing, ML scheduling,
an elaborate marketing site and electronic-signature providers are excluded.
Queues, automated diagnostics and speculative integrations are outside this scope.

## Proposed state boundaries

- Booking: requested → confirmed, rejected or cancelled; confirmed → checked-in
  or cancelled. Rescheduling is a validated operation, not an arbitrary status.
- Work order: ready → in-progress → completed → closed, with an explicit
  awaiting-approval branch returning to in-progress after a valid decision.
- Estimate: draft → issued → accepted, rejected, expired or superseded.

These state names are proposals. Agree detailed transition tables, actors and
side effects before implementing each module. Booking confirmation does not
require immediate creation of a work order; the exact check-in boundary is open.

## Questions requiring a decision before the relevant implementation

1. Which service durations, buffers and resource capabilities define availability?
2. What are opening hours, staff availability exceptions and absence rules?
3. What happens when a repair overruns or awaits approval while occupying a bay?
4. When is the work order created, and what constitutes completed versus closed?
5. Can an adviser update assigned work, and what audit/customer data can each role see?
6. Who may approve work: vehicle owner, booking contact or an explicitly nominated
   authorizer? How is the link delivered without exposing tokens?
7. Which quantities, tax treatment and rounding rules are supported in estimates?
8. How are ambiguous and nonexistent local booking times handled?

## Completion and demonstration

A synthetic customer request must progress through a real confirmation,
allocation, work order, estimate decision and completion. A reviewer must be able
to reproduce setup and verify the failure cases in
[testing-strategy.md](testing-strategy.md). Unfinished functionality and operator
assumptions must remain visible. Public deployment is separately approved.
