# Local workshop demonstration

The supported demonstration is one workshop, with synthetic contacts, vehicles,
staff and work. It is not a live garage service. The rules below were accepted
on 21 October 2026 and resolve the earlier open MVP policy questions.

## Run it (PowerShell, repository root)

Use Node.js 24.13.0, pnpm 11.25.0 and Docker's Linux engine. Follow the network
exposure checks in [database setup](database.md) before starting local services.
Preserve the existing local environment and database volume together.

```powershell
pnpm install --frozen-lockfile
pnpm db:start
pnpm db:setup
pnpm db:migrate
pnpm auth:setup
pnpm demo:seed
pnpm build
pnpm start --hostname 127.0.0.1 --port 3000
```

Stop on any failed command. Auth setup copies only the running local project's
keys into ignored `.env.local`, preserving matching values and refusing mismatches.
The administrative key is used only by the local fixture script; application
access uses the publishable key and the separate unprivileged database login.
Never print or publish the environment file or service status output.

Open [Bayframe locally](http://127.0.0.1:3000). Read synthetic login details from
`output/demo-credentials.txt` locally. The fixture script is idempotent and
preserves existing credentials. It creates manager, adviser, technician, inactive
and non-staff test accounts, plus an inaccessible second workshop for denial
checks. These are demonstration identities, not real staff. Public signup is
disabled. There is no invitation, recovery or email-delivery UI.

1. On **Request an appointment**, enter synthetic contact/vehicle details and an
   absolute ISO 8601 time. Check availability if useful, then submit the request.
2. Sign in as manager or adviser. Open **Schedule**, expand the request, choose
   a bay and linked technician, then confirm. A conflict leaves the request intact.
   Select its workshop day in **Resource timeline** to see both reservations.
   Timeline links focus the booking row; the table holds the detailed actions.
3. Check in the confirmed booking, then choose **Open work order**. The job sheet groups vehicle, tasks and estimate versions. Add its work tasks and prepare an estimate.
   The interface creates one line per estimate version; the service accepts up
   to 50 lines. Issuing freezes the snapshot and displays its decision link once.
4. Copy that link for the synthetic booking contact. Open it in another browser
   session, review the exact version/amounts and explicitly accept or reject.
5. Sign in as the assigned technician and open **Work orders**. Complete each approved task, then complete
   the work order. The manager/adviser records handover and closes it.

To view revised records after issuing a link, copy the link first, then choose **Refresh after copying link** to update the records. The raw capability is not stored and cannot be recovered; issue a
new version if the link is lost. No real customer messages are sent.

## Scheduling policy and integrity

- Every service is exactly 60 minutes with no buffer, Monday–Friday 09:00–17:00
  in the workshop's named timezone. The demonstration uses Europe/London.
- Inputs must include `Z` or an explicit offset. Bare local timestamps are
  rejected. Timezone conversion determines opening hours; absolute instants
  distinguish repeated clock times. Weekend DST transitions are outside opening
  hours. Display uses workshop-local time; the original input offset is not stored.
- Any active bay and active technician resource with an active staff link are
  eligible. There are no specialized service/capability classes in this demo.
- Requests reserve nothing. Confirmation atomically creates one bay and one
  technician allocation, booking state and audit event. `[start,end)` permits
  adjacent bookings. PostgreSQL exclusion and deferred pair/state checks enforce
  the critical invariant, including direct SQL and contention.
- Cancellation releases reservations and retains their history. Rescheduling
  replaces both allocations atomically; failure preserves the original booking.
  Check-in creates at most one work order and fixes its technician assignment.
- Managers record resource absences in **Absences**. An absence overlapping a reservation is
  rejected; resolve the booking first. There is no absence-editing UI.
- Overruns require staff intervention and rescheduling before check-in. Once
  checked in, the planned interval remains the reservation. This application
  does not measure physical occupancy or safely auto-extend an overrun. Awaiting
  approval retains the original reservation; later scheduled slots are not
  automatically blocked beyond its end. This limit must be resolved before real use.

The timeline uses absolute allocation/absence instants converted to the selected
workshop-local day. It clips absences to 09:00–17:00 and displays active allocations
only; released history remains in the database/table state. Both timeline and
table scroll horizontally on narrow screens without widening the document.

The database enforces scoped foreign keys, finite intervals, matching resource
types, active eligibility, absence rejection, one active resource per kind and
two allocations for each reserved booking. Transaction services recheck the
active actor, lock the booking then resources in UUID order, and commit changes
with audit. Infrastructure errors are distinct from controlled allocation conflicts.

## Work, estimates and permissions

Managers and advisers handle requests, allocation, work and estimates. Technicians
see only their assigned reservation times and work, without customer emails, resource management,
estimates or audit history. They can start assigned work, mark approved tasks
complete and complete the order. Only managers/advisers record handover; audit
history and resource absence creation are manager-only. Application membership is
checked on every protected server read/action and again inside transactions.

Work states are `ready → in-progress → completed → closed`. Issuing an estimate
sets `awaiting-approval`; an explicit decision returns it to `in-progress`.
Tasks cannot be completed without the latest estimate accepted. Completion
requires at least one task, all tasks done and that current approval. Closing
records handover and releases remaining reservations. Rejected work requires
a revised estimate before tasks can be completed.

Staff can start a ready order for planning. Completion controls appear only when
the current estimate is accepted and the relevant tasks remain to be done.
To change a pending issued scope, prepare a replacement draft, add its planning
tasks, then issue the new version. A rejected estimate can likewise be revised
and resubmitted. Technicians see an approval-waiting message while completion is
unavailable.

The manager-only **History** view links each event to its booking, work order, estimate or resource.
New task-addition/completion events also link to the exact task with actor/time.
Earlier events retain their originally recorded detail; missing historical task
identifiers are not reconstructed.

Estimate versions increase under the work-order lock. A new draft invalidates
older links; issuing a new version supersedes unresolved issued versions. Currency
is GBP, quantities are positive integers, prices are integer pence excluding VAT,
and VAT is 20%, rounded to the nearest penny per line. The net limit is £1,000,000.
Issued lines, money, ownership, version, token and expiry are immutable in SQL.
Database checks verify issued totals against lines. There is no invoice/payment
or tax-advice feature.

Links contain 256 random bits, stored only as SHA-256 hashes, and expire 48 hours
after issue. The browser fragment is read into memory then removed from the URL;
preview/decision use same-origin POST Server Actions. No token enters URL paths,
query strings, application logs, referrers or audit. Refreshing the customer page
requires reopening the original complete link. A current unexpired repeated
identical decision is idempotent; a conflicting decision, expired link or older
version fails. One database decision row is allowed per estimate. Issuing and
deciding serialize on the same work-order lock. Possession of a link grants the
decision capability; independent recipient identity verification is not claimed.

A revised link can be opened in the same customer tab. The preview updates to
that version and decision submission stays bound to the displayed estimate.

## Checks and limits

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm db:verify
pnpm test:integration
$env:BAYFRAME_LIVE_TESTS='1'
pnpm exec node --env-file=.env.local node_modules/vitest/vitest.mjs run src/auth/integration.test.ts
Remove-Item Env:BAYFRAME_LIVE_TESTS
pnpm build
pnpm test:browser
```

Stop the interactive application server before `test:browser`; its configuration
starts its own production server on port 3000 and refuses to reuse another server
by default. The test uses installed Chrome. On a fresh machine install Chrome or
use Playwright's documented Chrome installation command. Browser tests add only
synthetic records to the local demonstration database and preserve their history;
integration tests create and remove their own disposable databases. No reset or
pre-existing database deletion is used. Browser screenshots/results stay in ignored
`output/playwright/`. No actual customer data belongs in this environment.

[Roadmap](../ROADMAP.md) owns the executed evidence. The prepared CI workflow runs
the local gates, actual auth checks and browser journey. A prepared workflow is
not a verified remote CI run. No deployment, production TLS/cookies, rate limiting,
backup/recovery, real operator validation or real-customer readiness is claimed.
Docker still publishes local platform ports on all interfaces on the tested host;
network isolation remains unproved. Stop local services with `pnpm db:stop` when
finished, preserving volumes.
