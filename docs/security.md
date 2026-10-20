# Security model

Status: design requirements, not an implemented assurance. Updated: 20 October 2026.

## Trust boundaries

Treat browser input, identifiers, cookies, booking references and approval links
as untrusted. Server Actions, HTTP handlers and server-rendered reads all need
their own applicable checks; hidden buttons and protected layouts are insufficient.

Supabase Auth establishes identity. Application-owned staff membership and roles
establish permission. Reject missing/inactive staff membership and scope every
business lookup to the permitted workshop and record. Do not trust a browser's
workshop ID or editable user metadata as authority.

Use current official server-side session verification and cookie-refresh
guidance. Do not treat an unverified cookie/session object as proof of identity.
Document expiry/revocation behaviour and avoid caching personalized/session-setting
responses across users.

## Initial staff permission proposal

| Operation | Manager | Adviser | Technician |
| --- | --- | --- | --- |
| View permitted schedule | Yes | Yes | Yes, minimal necessary details |
| Confirm booking / allocate / reschedule | Yes | Yes | No |
| Create/issue estimate | Yes | Yes | No |
| Update assigned work | Yes | Open decision | Assigned work only |
| Manage staff / workshop settings | Yes | No | No |
| View audit history | Yes | Restricted, definition pending | Restricted, definition pending |

Default deny unspecified actions. Define permissions for cancellations, estimate
corrections and work-order closing before those mutations are implemented.
Customer capability access never grants staff permissions.

## Database access

Proposed business access is server-only Drizzle through an explicitly scoped
runtime role, separate from migration administration and limited to required
operations. The final role grants are an implementation decision; do not use
superuser/BYPASSRLS casually or claim direct queries inherit a user's auth context.

Business tables should not be reachable through an unintended Supabase Data API
path. Decide schema exposure and grants explicitly. If tables are exposed, enable
RLS with tested policies appropriate to that path. Verify actual grants, roles
and both allowed/denied queries; application checks alone do not secure an
accidentally public alternate interface.

## Customer requests and approval links

Public request submission needs runtime validation, bounded input and abuse
controls appropriate to deployment. A booking reference grants no record access.

Approval access uses a cryptographically unpredictable, narrowly scoped,
expiring token bound to one estimate version and permitted decision. Store a hash
instead of the raw token. Token expiry and estimate lifecycle must be checked
inside the atomic decision operation. Handle repeated decisions idempotently;
reject contradictory replays and invalid/superseded versions.

Opening a link must not approve work; require an explicit state-changing action
with the applicable CSRF/origin protection. Prevent token leakage through logs,
analytics and referrers; avoid third-party content on the approval page. Link
delivery and authorized-recipient rules remain open. Do not send real messages
without explicit authorization.

## Secrets and personal data

- Keep database credentials, auth secrets and administrative keys server-only.
  Never put secrets in public environment variables, source, fixtures or logs.
- Add an appropriate ignore policy before creating local secret files. A future
  environment example contains placeholders only; setup is not implemented yet.
- Use synthetic demo/test data. Do not copy actual customer records into fixtures.
- Return safe errors while preserving useful internal classification/correlation.
- Minimize customer data returned to staff interfaces and customer capabilities.
- Define retention, authorized data correction and recovery before real usage.

## Required security evidence

Test anonymous, inactive/non-staff, wrong-role, wrong-workshop and unassigned
technician requests at server boundaries, including direct invocation. Test
alternate database/API exposure and invalid, expired, replayed and superseded
customer capabilities. Verify no secrets enter bundles or reports. A passing
happy-path login test is not a security review.

Deployment also requires review of rate limits, HTTPS/cookies, dependency
versions, connection privileges, backup/recovery and safe monitoring. None is
implemented or approved for production here.

References: [Next.js authentication](https://nextjs.org/docs/app/guides/authentication),
[Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
