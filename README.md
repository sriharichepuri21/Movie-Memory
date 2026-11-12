# Movie Memory

A small personal cinema corner: sign in with Google, save one favorite film, and discover a short fact about it. Built with **TypeScript, Next.js App Router, React, Tailwind CSS, Postgres, Prisma, Google OAuth (Auth.js), and the OpenAI Responses API**, plus framer-motion and lucide-react for presentation.

**Chosen extension: Variant A — Backend-Focused (Caching & Correctness).** A database row lock, a precise 60-second cache, and stale-on-provider-error fallback put the depth where this exercise asks for it. Variant B's editable movie and optimistic client cache are intentionally outside this submission's scope.

## Start here

Use **Node 24 LTS** (`nvm use`, if you use nvm), npm, and Docker Compose or an existing Postgres server. The lockfile is included.

```sh
npm ci
cp .env.example .env
openssl rand -base64 32
```

Paste the generated value into `AUTH_SECRET` in `.env`. Fill the Google and OpenAI values listed below.

```sh
docker compose up -d --wait db
npm run db:migrate
npm run dev
```

Open **http://localhost:3000**. Sign in with Google, enter a favorite movie, and view the dashboard. `npm run db:migrate` applies the checked-in initial migration; it does not create the database itself. For existing Postgres, create a database and put its connection string in `DATABASE_URL` instead of using Compose.

**Credential-free preview:** `npm ci && npm run dev`, then open **http://localhost:3000/demo**. This public page uses a fixed sample profile and local state; it does not authenticate users, write to Postgres, or call OpenAI. Its controls demonstrate onboarding and an error state. `/dashboard` and the APIs always require a real session. Google sign-in is disabled until its required credentials are set.

**Build and serve:** `npm run build` followed by `npm start`. Use the same `.env` and port 3000. No network fonts or movie-image services are required.

## Environment and provider setup

All variables below are server-only. None use a `NEXT_PUBLIC_` prefix.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Compose defaults are in `.env.example`; change these for any shared environment. |
| `AUTH_URL` | Exact application origin, normally `http://localhost:3000`. Keep browser origin, OAuth callback, and this value consistent. |
| `AUTH_SECRET` | Random session/authentication secret, generated above. |
| `AUTH_GOOGLE_ID` | Google OAuth web application's client ID. |
| `AUTH_GOOGLE_SECRET` | Google OAuth web application's client secret. |
| `OPENAI_API_KEY` | API key for your OpenAI project. Billing/model access must be configured there. |
| `OPENAI_MODEL` | A text model available to that project; the example uses `gpt-4.1-mini`. Change the configuration if your project uses another supported Responses model. |
| `TEST_DATABASE_URL` | Tests only: a **separate disposable database ending in `_test`**. It is never used by the normal app. |

In Google Cloud Console, configure the OAuth consent screen and create a **Web application** OAuth client. Add `http://localhost:3000` as an authorized JavaScript origin and **`http://localhost:3000/api/auth/callback/google`** as an authorized redirect URI. Add your Google account as a test user if the consent screen is in testing mode. Use the HTTPS equivalents when separately reviewing a deployment.

Auth.js discovers `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL`, and `AUTH_SECRET`. It handles the OAuth callback and CSRF protection for its own authentication actions. Do not enable permissive email account linking or add a credentials provider for the preview.

OpenAI is called only from the server. Only the movie title is sent, with no profile data, OAuth tokens, or user ID. The request uses `store: false`, a 10-second SDK timeout, no automatic retries, and a 220-token output limit. `store: false` is not a claim of zero provider retention; review the provider's data controls for your account. Missing/invalid credentials exercise the same friendly fallback as a provider outage.

## Architecture overview

![Movie Memory architecture: the browser reaches Next.js pages, which fetch the API routes; the fact service locks the user row in PostgreSQL and calls OpenAI only on a cache miss; Auth.js handles Google sign-in and stores sessions in PostgreSQL.](docs/architecture/architecture.png)
### Request and identity flow

The App Router server pages at `/`, `/onboarding`, and `/dashboard` read a database-backed Auth.js session. A signed-out visit to a protected page redirects to `/`. A signed-in account without a movie goes to onboarding; once the movie exists, both `/` and `/onboarding` lead to the dashboard. Auth.js's Prisma adapter persists the Google user, account, and opaque session. Logout deletes the session server-side. Missing names use “Movie lover”/“there”; missing or broken photos use initials, and missing email is displayed safely.

Route handlers at `GET /api/me`, `PUT /api/me/movie`, and `GET /api/fact` validate identity on the server. User ID comes exclusively from the session. There is no arbitrary-user fact endpoint or client-supplied owner. The movie endpoint accepts **only** `{ "movie": "..." }`; fact query selectors are rejected. Responses are private and `no-store` so browsers/shared caches do not reuse another account's response. The movie mutation additionally requires an exact `Origin` match and JSON. Server-side validation trims input and accepts 1–120 UTF-16 code units, rejecting blank/control-character input. One-character titles such as *M* are valid.

The movie is a first-time onboarding choice. An atomic compare-and-set fills `User.favoriteMovie` only if it is null. Repeating the same submission succeeds; conflicting submissions from two tabs produce one winner and a 409. There is no silent movie-edit contract. The UI follows that 409 back to the dashboard.

### Storage and fact generation

`User`, `Account`, `Session`, and `VerificationToken` follow the Auth.js adapter contract. A nullable `favoriteMovie` identifies incomplete onboarding without a separate flag. `Fact` stores its owner, exact saved movie title, generated text, and completion timestamp. The `(userId, movie, createdAt DESC)` index supports the most-recent-fact query. Every read includes both owner and movie; identical titles across accounts never share a fact. There is no organization or workspace tenancy layer.

The small fact service depends on a lock-scoped store and a generation function, allowing deterministic clock/provider tests. Its Prisma implementation runs one interactive Postgres transaction:

1. Acquire `SELECT ... FOR UPDATE` on the authenticated user's row using a parameterized query.
2. Read that user's persisted movie and latest matching fact **after acquiring the lock**.
3. Use Postgres `clock_timestamp()` to calculate age. A fact is fresh only when `0 <= age < 60,000 ms`; exactly 60 seconds expires it. This is a rolling age check, not an aligned minute bucket.
4. On a miss, call OpenAI. Store a successful fact with a second database clock reading at completion, then commit. Queued callers see that write and return the same fact.
5. If generation fails, return the newest matching saved fact as `source: "stale"`, with a warning and the original timestamp. With no saved fact, return a friendly 503. A storage failure is reported as an error, never as a successful unsaved fact.

The lock is in Postgres, so it works across tabs, requests, and app processes. Different users lock different rows. The transaction explicitly uses Read Committed isolation so each statement after a queued lock sees the preceding writer's commit. This design needs neither a worker nor Redis. Postgres releases locks on rollback/disconnection; there is no stuck process-local flag. The 15-second lock wait, 5-second connection wait, and 30-second transaction deadline bound the work. The route declares a 40-second server budget, covering the connection wait plus transaction deadline; deployment limits must still be reviewed.

The dashboard fetches a fact after rendering its profile/movie. Loading, retry, unavailable, and stale-fallback states are explicit. React state holds the current screen's response, while the **server owns the 60-second cache**. The "New fact" button shows a countdown derived from the fact's `generatedAt` so the cache window is visible rather than silent; the server still decides. There is no 30-second client cache or optimistic edit flow.

### Frontend

The UI is Tailwind CSS 4 on a small token set in `src/app/globals.css`, with Almarai and Instrument Serif loaded through `next/font`. Shared primitives (`Button`, `Badge`, `Alert`, `Poster`) live in `src/components/ui.tsx`. Two presentation-only dependencies are used: `framer-motion` for the landing and dashboard entrance animations, isolated in `src/components/motion.tsx` and disabled under `prefers-reduced-motion`, and `lucide-react` for two icons. The poster tile is CSS: its hue is derived from the title, so no image service is called. The landing page's three sections and the `/demo` preview are presentation; no business logic depends on them, and the backend is the substance of this submission.

## API examples

Authenticated `GET /api/fact` returns:

```json
{
  "fact": { "id": "...", "movie": "Arrival", "text": "...", "generatedAt": "2026-11-11T00:00:00.000Z" },
  "source": "cache"
}
```

`source` is `generated`, `cache`, or `stale`; stale results include `warning`. Errors consistently use `{ "error": { "code": "...", "message": "..." } }` with 400/401/403/409/413/415/500/503 as appropriate. `GET /api/me` returns `{ "user": { "id", "name", "email", "image", "favoriteMovie" } }`. `PUT /api/me/movie` returns `{ "movie": "Arrival" }`. See [docs/API.md](docs/API.md) for the route/error table.

## Verification

```sh
npm run check                     # lint, TypeScript, deterministic unit tests
npm run build                     # production build
npm audit --audit-level=moderate
```

Compose creates `movie_memory_test` on its **first** initialization. If you already had a Compose volume before adding the test DB, create it without deleting that volume:

```sh
docker compose exec db createdb -U movie_memory movie_memory_test
```

Apply the same migration to that separate test database, then run the database and browser tests:

```sh
export TEST_DATABASE_URL="postgresql://movie_memory:movie_memory@127.0.0.1:5432/movie_memory_test?schema=public"
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate
npm run test:integration
npx playwright install chromium
npm run build
npm run test:e2e
```

These examples use a POSIX shell; on Windows use WSL/Git Bash or set environment variables in PowerShell. Tests refuse a database name that does not end in `_test`. They create uniquely prefixed fixture users and remove them afterwards. Browser tests start a production server on **127.0.0.1:3100**, insert real Auth.js database sessions as fixtures, and never add an app auth bypass. They do not exercise Google's live consent/callback or make paid OpenAI calls.


The checked-in CI workflow repeats checks against a disposable Postgres 17 service. The initial migration and its **test-only** rollback rehearsal are described in [docs/DATABASE.md](docs/DATABASE.md). Do not point test or rehearsal commands at a live database.

## Tradeoffs and failure modes

- Holding a database connection during a bounded provider call makes concurrency easy to reason about at this scale. A lease/fencing-token worker would improve throughput at larger scale, but adds recovery and stale-writer complexity.
- The lock guarantees one in-flight generation per user while this transaction is alive. It cannot guarantee exactly-once remote billing: a crash/network ambiguity after OpenAI responds but before commit can cause a later request to generate again. SDK retries are disabled to avoid multiplying requests inside one attempt. A sustained outage still causes sequential failed attempts; a circuit breaker would be the next step.
- Cache identity uses the exact saved title. There is no movie catalog or canonical ID; ambiguous titles and AI inaccuracies are acknowledged in the UI and prompt. Facts are rendered as text, not injected HTML.
- Facts are appended as required by the exercise. No cleanup job or production retention duration is invented. Account deletion cascades related rows in the draft schema, but there is no deletion UI. Retention, OAuth token storage/encryption, session lifetime, and deletion policy require owner review before production use.
- Auth.js v5 is pinned to a beta release for its App Router integration. Prisma 6 is kept on its established client API. Two scoped dependency overrides take the CLI's `deepmerge-ts` and lint tooling's `minimatch` to patched releases; migration/generation, lint, tests, and build verify compatibility. The lockfile captures the tested tree. Audit results are a point-in-time check.
- HTTPS/proxy trust, rate limiting, account controls, database pooling capacity, migrations, pricing budgets, and deployment approval are out of scope for this exercise.

## With two more hours

1. Run a credentialed Google consent/callback and OpenAI smoke test, including provider timeouts and revocation.
2. Add a per-user failure cooldown and structured, privacy-conscious cache hit/provider latency/error metrics; agree on spending limits and load-test the connection pool before moving generation to a worker.
3. Agree on retention and account deletion, then add a reviewed cleanup plan and more keyboard/screen-reader checks.

## References

- [Next.js App Router setup](https://nextjs.org/docs/app/getting-started/installation)
- [Auth.js Prisma adapter](https://authjs.dev/getting-started/adapters/prisma) and [Google provider](https://authjs.dev/getting-started/providers/google)
- [Postgres row-level locks](https://www.postgresql.org/docs/17/explicit-locking.html)
- [OpenAI TypeScript SDK: retries/timeouts](https://developers.openai.com/api/reference/typescript) and [Responses create](https://developers.openai.com/api/reference/resources/responses/methods/create)
