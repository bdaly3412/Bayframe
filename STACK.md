# Technology stack

Status: local demonstration pinned, ADR-001 through ADR-003 accepted, 21 October 2026.
This file owns tool selection; ADRs own the reasons for major choices.

| Area | Choice / selection status | Introduction point |
| --- | --- | --- |
| Runtime and package manager | Node.js 24.13.0 LTS, pnpm 11.25.0 | BF-003; exact runtime and lockfile declarations |
| Language | Strict TypeScript 5.9.3 | BF-003 |
| Application | React / React DOM 19.3.1, Next.js App Router 16.4.2 | BF-003; local public status page |
| Styling | Tailwind CSS / PostCSS plugin 4.3.3, PostCSS 8.5.31 | BF-003; application-owned markup |
| Database | PostgreSQL 17.11; btree_gist 1.7 | BF-005; local Supabase image 17.11.0.004 |
| Persistence | Drizzle ORM 0.45.4, Kit 0.31.11, pg / @types/pg 8.23.1 | BF-005; versioned custom SQL baseline |
| Authentication | Supabase Auth, @supabase/ssr 0.12.7, @supabase/supabase-js 2.118.0, server-only 0.0.1 | BF-007; verified identity, refresh and scoped membership |
| Boundary validation | Zod 4.6.7 | BF-007 onward; server input validation |
| Unit/integration tests | Vitest 5.0.5, Vite 7.3.7; real PostgreSQL assert checks | BF-003 rendering test; BF-004 intervals; BF-005 migration/privileges; BF-006 persistence/integrity |
| Linting | ESLint 9.39.4, eslint-config-next 16.4.2 | BF-003; Core Web Vitals and TypeScript rules |
| Browser tests | @playwright/test 1.64.1, installed Chrome | BF-011 synthetic journey and permission checks |
| CI | GitHub Actions; SHA-pinned official actions | BF-008/011 workflow prepared; remote run unverified |
| Local infrastructure | Docker Linux engine and project-local Supabase CLI 2.121.0 | BF-005; dedicated project/ports; requested loopback binding ineffective on this host |
| Logging | Structured server logs | First server workflow |
| Error monitoring | Sentry if justified | Release review; no provisioning authorized |
| Deployment | Vercel and managed PostgreSQL under consideration | Separate deployment decision and approval |

## BF-002 reviewed bootstrap baseline

Accepted by the project owner on 20 October 2026:

- Supported Node.js 24 LTS patch and pnpm; resolve/pin exact compatible versions
  in BF-003, including a lockfile and package-manager/runtime declarations. Exact
  versions are now recorded above and in `package.json` / `.node-version`.
- Next.js App Router on Node.js, strict TypeScript, `src/app`, `@/*`, Tailwind CSS,
  ESLint and Vitest. No experimental opt-ins or extra component library initially.
- One local Supabase application/auth database, Drizzle application migrations
  and `pg` driver when database work begins. Business schema `app` stays outside
  Data API exposure; runtime and migration privileges are separate.
- BF-003 excludes Supabase/Drizzle/Zod installation, database setup, authentication,
  booking logic, dashboard screens, browser-test infrastructure and CI. Add these
  in their owning stage, not as speculative bootstrap dependencies.

BF-003 resolves packages from the registry and checks their runtime/peer
requirements. ESLint 9 avoids the documented ESLint 10 plugin peer warnings;
TypeScript 5.9 stays within the lint parser's supported range. Vite 7 supplies
Vitest's compatible transform/runtime baseline. Node types match major 24.
pnpm enforces strict peer and engine checks, pins its script runtime via
`devEngines.runtime`, and allows only the required dependency build scripts.
See [setup commands](README.md#setup-and-verification) and
[executed evidence](ROADMAP.md#evidence-and-limitations).

## Selection and installation rules

- Check current official documentation, runtime requirements and compatible
  package versions before recommending APIs or installing dependencies.
- Add dependencies only when the approved phase uses them. Pin the runtime and
  package-manager versions; keep the lockfile under source control via the owner.
- Use one application migration history. Accepted owner: Drizzle. Do not let
  Supabase CLI and Drizzle independently manage the same application tables.
- Review generated SQL, extensions and constraints. Successful ORM generation
  does not prove that a required database invariant exists.
- Choose the runtime connection driver and pooling settings before implementing
  transactions. Reproduce the target PostgreSQL capabilities locally and in CI.
- Do not add queues, microservices, billing, caching or automated diagnostics without a
  demonstrated requirement and a separate scope decision.

## Official references

- [Next.js](https://nextjs.org/docs)
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js ESLint compatibility](https://nextjs.org/docs/app/api-reference/config/eslint)
- [Node.js 24.13.0 LTS](https://nodejs.org/en/blog/release/v24.13.0)
- [pnpm settings](https://pnpm.io/settings)
- [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [PostgreSQL](https://www.postgresql.org/docs/current/)
- [Drizzle](https://orm.drizzle.team/docs/overview)
- [Supabase](https://supabase.com/docs)
- [Vitest](https://vitest.dev/guide/)
- [Playwright](https://playwright.dev/docs/intro)
- [GitHub Actions](https://docs.github.com/en/actions)
