# Exercise coverage

Chosen: **Base + Variant A only**.

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Required stack | `package.json`, `src/app`, `prisma/schema.prisma`, `src/auth.ts`, `src/server/openai.ts` | Lockfile, typecheck, production build |
| Signed-out landing + Google button | `src/app/page.tsx`, Auth.js Google provider | Browser landing/providers check; live consent needs credentials |
| First-time / returning redirects | `/`, `/onboarding`, `/dashboard` server pages | Real session browser fixtures |
| Trim and min/max validation | `src/lib/movie.ts`, movie HTTP handler | Unit cases: blank, one character, 120/121, controls, malformed/extra fields |
| Persist movie for signed-in owner | `src/server/movies.ts` | Real DB and browser onboarding, conflict/retry tests |
| Dashboard profile/movie/logout | `dashboard-view.tsx`, dashboard page | Desktop/mobile browser tests; database session deletion |
| Missing photo/name | Avatar fallback and fallback copy | Null-profile browser test |
| OpenAI fact + DB persistence | `src/server/openai.ts`, fact service/store | SDK typechecked; real DB tests inject a deterministic provider |
| Rolling 60-second cache | `fact-service.ts` using DB time via store | 0, 59,999, 60,000, 60,001 ms and future-time tests; DB expiry |
| Burst protection | Postgres user-row `FOR UPDATE`; cache read after lock | 12 concurrent calls through two independent Prisma pools, one generated row/call |
| OpenAI failure fallback | Stale source + warning; friendly 503 without cache | Unit, DB, and browser failure/recovery cases |
| Authorization isolation | Session owner only, exact owner/movie DB query, rejected selectors | Unit and real DB cross-user negative cases; unauth browser/API |
| Secret handling | Server-only modules, no public secret env, sanitized errors | Source boundary review and production bundle inspection |
| Setup/migrations/architecture/tradeoffs | README + DATABASE/API docs | Fresh clone: `npm ci`, migrate, build |
| AI usage note | `AI_USAGE.md` | First-person note |

