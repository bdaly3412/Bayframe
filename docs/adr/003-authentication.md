# ADR-003: Managed authentication

Status: accepted by the project owner on 20 October 2026. Decision owner: project owner.

## Context

Staff need authenticated sessions and distinct permissions. Customers need a
separate narrow request/approval flow. Building password storage, recovery and
session infrastructure is not the project's central engineering objective.

## Problem

Establish trustworthy identity without confusing it with permission or assuming
an authentication provider automatically secures direct database queries.

## Considered alternatives

| Option | Benefit | Cost/limitation |
| --- | --- | --- |
| Custom authentication | Full control | Password/recovery/session responsibilities and substantial security work |
| Other managed provider | Comparable identity capabilities | Additional integration/evaluation; no demonstrated requirement to switch |
| Supabase Auth | Managed identity and local platform fit | SSR/cookie integration, provider coupling and application authorization still required |

## Decision

Use Supabase Auth for staff identity and current official Next.js server-side
integration guidance. Resolve role and active workshop membership from trusted
application records. Verify the applicable identity and permissions at every
sensitive server/read boundary.

Use server-side Drizzle for business data with explicit query scoping and runtime
privileges. Decide Data API exposure, schema grants and any RLS policies before
creating business tables. A direct connection does not automatically adopt the
end user's Supabase JWT or RLS context. Use a separate administrative migration
role. Customer capabilities remain distinct from staff sessions.

## Reasons

Managed identity avoids implementing unrelated credential infrastructure while
retaining visible engineering responsibility for business authorization and data
integrity. Application staff records give explicit, testable role ownership.

## Consequences

We still own session verification/refresh, permitted actions, data minimization,
inactive staff handling, user-specific caching, safe errors, token handling and
tests. Managed auth is not a security certification. Secrets stay server-only;
public keys and exposed schemas still require deliberate policies.

## Risks

Trusting unverified session data, editable metadata, stale role claims, privileged
database connections or unintended Data API paths can bypass the intended model.
JWT validity does not imply immediate revocation; define required behaviour for
sensitive operations. SSR caching must not mix users' data or sessions.

## Revisit conditions

Demonstrated identity requirements, deployment restrictions, provider limitations
or operational evidence justify reconsideration. Do not add another auth library
solely for architectural variety.

## Acceptance discussion

Reviewed in BF-002 and accepted by the project owner on 20 October 2026:

- Supabase Auth provides staff identity; trusted application staff records hold
  role, active flag and workshop membership. Check membership on each protected
  operation; do not authorize using editable user metadata or role claims alone.
- Put business tables in an `app` schema outside the Data API's exposed schemas.
  Give `anon`/`authenticated` no business-schema grants. Verify both exposure and
  effective grants rather than assuming a custom schema is inherently private.
- Use a dedicated server runtime role, not the schema owner or a superuser, with
  no `BYPASSRLS`, no DDL and only required business DML. Use separate migration
  privileges. Application query scoping enforces workshop access; no user-JWT RLS
  context is assumed for Drizzle. Document any additional private-schema RLS
  before enabling it; an exposed data path requires tested RLS policies.
- First persisted entities are workshop, staff and bay/technician resources.
  Resolve exact staff/auth reference and deletion constraints in BF-006 against
  the actual local auth schema, preserving operational history.
- BF-007 delivers one protected resource read. Verify anonymous, non-staff,
  inactive and wrong-workshop denial as well as success. Protected mutations
  later add their own role checks. Do not treat login as the authorization test.
- Start with standard verified server-side sessions and explicitly deny inactive
  staff. Immediate invalidation of an otherwise valid identity token is not
  claimed; define stricter revocation requirements before sensitive deployment.

Customer approval links remain a later separate capability flow. No remote auth
service, email delivery or account changes are authorized. Owner acceptance
records the design, not implemented authentication or authorization.

References: [Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Schema reference: [Supabase schema exposure and grants](https://supabase.com/docs/guides/api/using-custom-schemas).
