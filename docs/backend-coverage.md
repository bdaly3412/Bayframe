# Backend requirement coverage

Verified: 22 October 2026. Phase BF-014. This covers the accepted local workshop
scope, not production readiness. The accepted ADRs and the later policies in
[workflow.md](workflow.md) resolve historical questions in the original product
requirements. [ROADMAP.md](../ROADMAP.md) owns current status and executed checks.

Classification: **V** = Implemented and currently verified; **I** = Implemented
but insufficiently verified; **M** = Missing or defective; **X** = Explicitly
excluded; **B** = Blocked by a genuine decision or external dependency.

The completed local scope has no outstanding I, M or B item. The exclusions
below remain exclusions; they are not implemented production features.

## Requirement-to-evidence matrix

Paths below are relative to the repository root. Services are in
[`src/workshop/service.ts`](../src/workshop/service.ts), domain validation in
[`rules.ts`](../src/workshop/rules.ts), and protected entry points in
[`src/app/actions.ts`](../src/app/actions.ts). `PG` means the real PostgreSQL
[`workflow.integration.test.ts`](../src/workshop/workflow.integration.test.ts)
suite; `Auth` means the actual local Auth/runtime
[`integration.test.ts`](../src/auth/integration.test.ts) suite. Action unit tests
use mocks to verify routing and safe responses; they do not establish database
behaviour.

| Requirement | Authoritative policy | Entry point / supported consumer | Service / owning source | Database enforcement | Current tests / evidence | Status | Required action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Scoped entities, relationships and retained history | ADR-002/003; data-model.md | Database setup and all workflows | scripts/db/schema.ts; workflow-schema.ts | Scoped FKs, restricted deletion, unique identities and relationships | db:verify; 26 invalid foundation cases; PG scope and history assertions | V | None |
| Migration reproducibility and supported current state | ADR-002; database.md | db:migrate; db:verify; test:integration | scripts/db/local.mts; migrate.mts | Drizzle journal; migration owner; 8 versioned migrations | Empty disposable database, second application with unchanged hashes/journal; existing demonstration migration run succeeds | V | No migration changed; no new upgrade path introduced |
| Private business schema and platform-owned Auth | ADR-003; security.md | Local Supabase Data API and server runtime | scripts/db/verify.mts; local.mts | app not exposed; API roles denied; auth ownership retained | Runtime/anon/authenticated/service-role grants; auth DDL/ownership/ACL comparison; DDL/auth/journal/escalation denial | V | None |
| Least-privilege workflow writes | ADR-003; security.md | Server-only database pool | src/db/index.ts; migrations 0004/0005 | SELECT/INSERT and column UPDATE only; no DELETE/TRUNCATE or role escalation; guarded UPDATE(id) permits locks | db:verify; PG actual runtime operations and immutable identities | V | None |
| Workshop, staff and resource setup | workflow.md; security.md | auth:setup; demo:seed; read-only Resources | scripts/auth/configure.mts; seed.mts; auth/resources.ts | Scoped memberships, unique names/links, active flags, validated timezone | Repeated setup/seed preserves existing credentials; Auth scoped resources; db:verify foundation cases | V | Supported synthetic setup only |
| Verified staff identity and session lifecycle | ADR-003; security.md | Login, proxy, logout, protected pages/actions | auth/server.ts; access.ts; proxy.ts; login/logout actions | Platform-owned Auth sessions; active application membership | 12 live Auth cases include refresh into cookies, verified access and logout; proxy unit tests cover cookie/cache propagation; browser sign-in | V | None within local scope |
| Active roles and workshop authority | workflow.md permission policy | Every protected action/read | requireStaff; withActor; lockBooking; lockWork | Trusted membership FKs; transaction-time membership row lock | Auth anonymous/inactive/nonstaff/technician/wrong-workshop denial; action role routing; PG forged/inactive/foreign/wrong-role mutations | V | None |
| Assigned technician access and minimal projection | workflow.md; security.md | Technician schedule and assigned job sheets | lockWork; workspace | Work-order assignment and scoped relationships | PG unassigned transition denial and empty customer/estimate/resource/audit projections; browser technician journey | V | None |
| Public appointment request | product requirements; workflow.md | Request appointment form; runAction(request) | createRequest; requestInput | Scoped customer/vehicle/booking relationships; requested state | PG valid/invalid input, no reservations; action field validation; browser persisted request | V | None |
| Fixed duration, opening hours and timezone inputs | workflow.md scheduling policy | Request, availability and reschedule forms | absoluteTime; createRequest; allocate | valid_slot; finite interval checks; [start,end) | Unit invalid/bare-local timestamps; PG London offsets, DST-season boundaries, weekends/hours and adjacency | V | Keep accepted 60-minute weekday policy |
| Advisory availability | workflow.md | Check availability form | availability | Queries active scoped resources, staff links, allocations and absences | PG counts before/after request, allocation, absence and release; browser free-capacity check | V | None |
| Atomic bay and technician confirmation | ADR-002; workflow.md | Schedule confirmation form | allocate | Exclusion, active-kind uniqueness, resource/slot guards and deferred pair/state checks | PG independent lock wait, same-booking race, direct SQL invalid pair and injected second-allocation rollback; browser conflict | V | None |
| Healthy resource contention | ADR-002; testing strategy | Schedule confirmation | allocate | Resource UUID lock order and GiST exclusion | 100 attempts: 1 confirmation, 99 controlled conflicts, 2 active allocations; configured pool maximum 5; final-state assertions | V | Correctness diagnostic only; no throughput claim |
| Cancellation and request rejection | workflow.md | Schedule resolve/change controls | cancelBooking | Deferred booking/allocation consistency; released rows retained | PG release/history, repeated invalid cancellation and confirm/cancel race; browser cancellation and rejection | V | None |
| Atomic rescheduling and rollback | ADR-002; workflow.md | Change booking form | allocate with replacement start | Same transaction replaces pair and interval; booking/resource locks | PG success, audit-failure rollback, confirm/reschedule race and aligned final rows; browser failed replacement retains confirmation then succeeds after release | V | None |
| Resource eligibility and absence conflicts | workflow.md | Manager Absences and schedule forms | recordAbsence; allocate | Active resource/type/staff checks; scoped resource lock; overlapping absence/allocation guards | db:verify relationships; PG absence atomic denial and successful adjacent absence; browser controlled conflict and recovery | V | No absence editing in accepted UI |
| Check-in and unique work order | workflow.md | Check in / create work order | checkIn | Unique booking/work-order relationship; booking lock and deferred reservation checks | PG complete journey and forbidden states; browser check-in/job-sheet navigation | V | Assignment fixed at check-in |
| Planning, progress and permitted transitions | workflow.md | Task/start controls in job sheet | addTask; updateWork; workCapabilities | Scoped task/work relationships, valid state values; work-order lock | Unit capability table; PG planning after replacement draft, task attribution and unassigned denial; browser progress | V | None |
| Current approval gates | workflow.md | Task completion and work completion | updateWork; latest estimate under work lock | Immutable issued snapshot and one decision/version; service state machine owns transitions | PG no approval/rejection/new draft deny completion, accepted current scope enables it; browser rejection/revision/acceptance | V | None |
| Completion, handover and reservation release | workflow.md | Complete approved work; Record handover and close | updateWork | Transactional state/release/audit and deferred pair check | PG requires tasks and current approval, closed work retains released history; browser technician completion and manager handover | V | None |
| Estimate line handling | workflow.md accepted UI/service contract | Job sheet creates one line/version; service accepts 1–50 | createEstimate; linesInput | Scoped estimate lines, positive bounded integers | Unit invalid quantities/prices/line count; PG persisted multiple lines and 50-line issue/preview | V | Multi-line authoring UI excluded |
| Money and VAT arithmetic | workflow.md tax policy | Draft form and exact-version decision preview | totals; createEstimate; issueEstimate | Integer money, bounds, net/tax/total consistency; issue trigger compares line totals | Unit rounding/overflow; PG per-line rounding and exact £1,000,000 net limit | V | Keep GBP, integer quantities and 20% per-line VAT |
| Immutable issued versions and revisions | workflow.md; data-model.md | Draft/issue controls | createEstimate; issueEstimate | Unique version; estimate/line immutability triggers; non-draft insert denied | PG immutable amount/quantity/ownership fields, mismatch denial, new version invalidation; browser revision | V | None |
| Capability creation, storage and expiry | workflow.md customer-link policy | One-time staff issue result; customer fragment | issueEstimate; tokenHash; validateToken | Unique SHA-256 hash, issue/expiry checks; raw token never persisted | PG expiry/stale/malformed capability cases, issue rollback; browser fragment removal and revised link journey; bundle/report inspection | V | Manual synthetic contact delivery only |
| Exact preview and explicit accept/reject | workflow.md | Decision page; readDecision; submitDecision | previewDecision; decideEstimate; decision/view.tsx | Decision references exact estimate; issued data immutable | PG exact amounts/version; browser explicit reject and revised accept, same-tab link replacement; action controlled errors | V | No independent recipient identity claim |
| Replay and contradictory/stale decisions | workflow.md | Customer decision action | decideEstimate | Unique decision/estimate; work-order then estimate locks | PG identical replay idempotent, contradictory replay denied, superseded/expired denied; coordinated duplicate/conflicting submissions | V | None |
| Estimate revision/issue/decision contention | architecture.md; workflow.md | Staff draft/issue and customer decision actions | createEstimate; issueEstimate; decideEstimate | Shared work-order lock serializes version/state changes | Five coordinated race pairs, ten observed lock-wait checkpoints, both valid approval/revision orders; final work/decision/audit rows checked | V | Replaces old test that raced an already-invalid link |
| Atomic business history | architecture.md; data-model.md | Manager History; task/record links | audit; workspace | Scoped typed references; inserts share business transaction | PG actor/time/task references, estimate parent projection, issue/decision/audit rollback; browser links open exact estimate and task | V | Historical missing task IDs remain unchanged |
| Safe operational failures | architecture.md Observability | Server Action responses | actions.ts safeMessage | Business rollback remains transaction-owned | Action tests verify operation/category/UUID logs exclude SQL, PII and capabilities; controlled absence conflicts stay distinct | V | Unexpected failures remain generic to the browser |
| Configuration and connection recovery | architecture.md; database.md | Runtime pool | db/config.ts; db/index.ts | Fixed local target/role; bounded pool/timeouts | Unit missing/invalid credential rejection despite PGPASSWORD; real disposable idle backend termination, safe pool log and next successful query | V | No automatic retry of uncertain mutations |
| Input and capability leakage boundaries | security.md; workflow.md | All public/protected forms and customer decision page | Zod schemas; server-only modules; in-memory fragment capability | Hash-only persistence; minimal authorized selects | Action redaction tests, browser path/query removal and HTTP/bundle/report scans; no raw database errors logged | V | Browser memory and explicit staff link display are intentional |

## Explicit exclusions and future decisions

| Requirement / boundary | Authority | Supported path / current status | Database/tests | Classification | Required action |
| --- | --- | --- | --- | --- | --- |
| General staff/resource administration and workshop settings UI | security.md later permission table; workflow.md | Synthetic local setup scripts and read-only resources are supported; no CRUD UI/API is claimed | Seed/idempotence and foundation integrity checks above | X | Approve a separate policy and administration phase if needed |
| Invitations, account recovery and automatic customer-link delivery | workflow.md | No supported UI or message service | Local signup denial verified; no real messages sent | X | Delivery/account policy and exact external-operation approval before implementation |
| Absence editing and specialized service/capability classes | workflow.md scheduling policy | Create-only manager absences; any eligible active bay/linked technician | Existing creation and eligibility guards verified | X | Separate product approval for expansion |
| Physical overruns and bay occupancy after planned end | workflow.md accepted limitation | Reservation retains original interval after check-in/while awaiting approval | Planned reservations remain enforced; physical occupancy is not measured | X | Agree occupancy/overrun policy before real workshop use |
| Variable service durations, buffers, phases and tax regimes | workflow.md accepted policy | Fixed 60 minutes, no buffer, GBP and 20% VAT | Accepted rules tested above | X | Explicit policy approval before changing rules |
| Accounting, payments, inventory/integrations, franchises and speculative services | product-requirements.md non-goals | Not implemented | No placeholder endpoints or controls added | X | Separate scope decision |
| Production rate limits, TLS/cookies, backup/recovery, monitoring, network isolation and remote CI/deployment | workflow.md; security.md; database.md | Local verification only; Docker publishes platform ports beyond loopback on this host; remote CI/deployment unverified | No production validation or external mutation performed | X | Exact deployment/operations phase and environment approval required |
| Real operator validation, retention/correction, vehicle transfers, stricter session revocation and independent recipient verification | product/data/security limitations | Synthetic one-workshop assumptions; possession grants estimate capability | Local policy only; no real-customer readiness claim | X | Resolve before real use; not an unanswered local implementation requirement |

## Verification and limits

The current command results, counts and review outcome are recorded under BF-014
in the roadmap. Database checks create and remove only their own `bf_verify_*`
database. The recovery test terminates only an identified idle runtime connection
inside that disposable database. Existing demonstration data and shared volumes
are preserved. Browser tests add synthetic history and check capacity before
leaving reservations/absences; failures do not authorize deleting those records.

No schema, migration, dependency, architecture, role, tax, duration or capability
policy changed in this phase. No new endpoint or management interface was needed.
Next action: owner review of the verified local backend and explicit-path diff.
