# ADR-003: Managed authentication

Status: proposed. Date: 20 October 2026. Decision owner: project owner.

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

## Proposed decision

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

Confirm local Auth infrastructure, runtime/migration roles, Data API exposure,
trusted membership storage, first protected operation and revocation expectations.
No remote auth service or account changes are authorized by this proposal.

References: [Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
