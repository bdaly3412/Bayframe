# Technology stack

Status: proposed, 20 October 2026. No application dependencies are installed or
pinned. This file owns tool selection; ADRs own the reasons for major choices.

| Area | Proposed choice | Introduction point |
| --- | --- | --- |
| Runtime and package manager | Supported Node.js release, pnpm | Bootstrap; pin versions and check clean installation |
| Language | Strict TypeScript | Bootstrap |
| Application | React, Next.js App Router | Bootstrap; one application deployment |
| Styling | Tailwind CSS, small application-owned components | First functional interfaces |
| Database | PostgreSQL | Foundation; record actual major/minor version |
| Persistence | Drizzle ORM and versioned SQL migrations | First schema; custom SQL where necessary |
| Authentication | Supabase Auth | First staff access path; ADR-003 |
| Boundary validation | Zod | First external-input boundary |
| Unit/integration tests | Vitest; real PostgreSQL for database guarantees | First domain behaviour and schema |
| Browser tests | Playwright | First end-to-end workflow |
| CI | GitHub Actions | Once local checks are reproducible |
| Local infrastructure | Docker and local Supabase | Foundation; engine readiness required |
| Logging | Structured server logs | First server workflow |
| Error monitoring | Sentry if justified | Release review; no provisioning authorized |
| Deployment | Vercel and managed PostgreSQL under consideration | Separate deployment decision and approval |

## Selection and installation rules

- Check current official documentation, runtime requirements and compatible
  package versions before recommending APIs or installing dependencies.
- Add dependencies only when the approved phase uses them. Pin the runtime and
  package-manager versions; keep the lockfile under source control via the owner.
- Use one application migration history. Proposed owner: Drizzle. Do not let
  Supabase CLI and Drizzle independently manage the same application tables.
- Review generated SQL, extensions and constraints. Successful ORM generation
  does not prove that a required database invariant exists.
- Choose the runtime connection driver and pooling settings before implementing
  transactions. Reproduce the target PostgreSQL capabilities locally and in CI.
- Do not add queues, microservices, billing, caching or automated diagnostics without a
  demonstrated requirement and a separate scope decision.

## Official references

- [Next.js](https://nextjs.org/docs)
- [PostgreSQL](https://www.postgresql.org/docs/current/)
- [Drizzle](https://orm.drizzle.team/docs/overview)
- [Supabase](https://supabase.com/docs)
- [Vitest](https://vitest.dev/guide/)
- [Playwright](https://playwright.dev/docs/intro)
- [GitHub Actions](https://docs.github.com/en/actions)
