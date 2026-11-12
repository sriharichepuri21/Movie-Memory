# Movie Memory

A small personal cinema corner: sign in with Google, save one favorite film, and discover a short fact about it.

**Stack:** TypeScript · Next.js App Router · React · Tailwind CSS · Postgres · Prisma · Google OAuth (Auth.js) · OpenAI Responses API. Presentation also uses framer-motion and lucide-react.

| Landing | Onboarding | Dashboard |
|---|---|---|
| ![Landing page with Google sign-in](docs/screenshots/01-landing.png) | ![Onboarding: choose your favorite movie](docs/screenshots/02-onboarding.png) | ![Dashboard with a cached fact and countdown](docs/screenshots/03-dashboard.png) |

## Contents

- [Chosen extension](#chosen-extension)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [API](#api)
- [Testing](#testing)
- [Tradeoffs and failure modes](#tradeoffs-and-failure-modes)
- [With two more hours](#with-two-more-hours)
- [References](#references)

## Chosen extension

**Variant A: Backend-Focused (Caching & Correctness).**

- A database row lock, so a burst of requests produces one fact.
- A precise 60-second cache.
- A stale-on-provider-error fallback.

Variant B's editable movie and optimistic client cache are intentionally out of scope.

## Quick start

**Requirements:** Node 24 LTS (`nvm use`, if you use nvm), npm, and Docker Compose or an existing Postgres server. The lockfile is included.

1. Install and create your env file:

   ```sh
   npm ci
   cp .env.example .env
   openssl rand -base64 32   # paste the output into AUTH_SECRET
   ```

2. Fill in the Google and OpenAI values (see [Configuration](#configuration)).
3. Start the database, apply the migration, and run the app:

   ```sh
   docker compose up -d --wait db
   npm run db:migrate
   npm run dev
   ```

4. Open **http://localhost:3000**, sign in with Google, enter a favorite movie, and view the dashboard.

> [!NOTE]
> `npm run db:migrate` applies the checked-in initial migration; it does not create the database. With an existing Postgres server, create a database and put its connection string in `DATABASE_URL` instead of using Compose.

**Other ways to run it**

| Mode | Command | Notes |
|---|---|---|
| Credential-free preview | `npm ci && npm run dev`, then open **/demo** | Fixed sample profile and local state. Doesn't authenticate, write to Postgres, or call OpenAI. Its controls show onboarding and an error state. |
| Production build | `npm run build` then `npm start` | Same `.env`, port 3000. No network fonts or movie-image services are required. |

`/dashboard` and the APIs always require a real session. Google sign-in stays disabled until its credentials are set.

## Configuration

### Environment variables

All variables are server-only; none use a `NEXT_PUBLIC_` prefix.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Compose defaults are in `.env.example`; change them for any shared environment. |
| `AUTH_URL` | Exact application origin, normally `http://localhost:3000`. Keep the browser origin, OAuth callback, and this value consistent. |
| `AUTH_SECRET` | Random session/authentication secret (generated in Quick start). |
| `AUTH_GOOGLE_ID` | Client ID of the Google OAuth web application. |
| `AUTH_GOOGLE_SECRET` | Client secret of the Google OAuth web application. |
| `OPENAI_API_KEY` | API key for your OpenAI project. Billing and model access must be configured there. |
| `OPENAI_MODEL` | A text model available to that project; the example uses `gpt-4.1-mini`. Change it if your project uses another supported Responses model. |
| `TEST_DATABASE_URL` | Tests only: a **separate disposable database whose name ends in `_test`**. Never used by the app. |

### Google OAuth

1. In Google Cloud Console, configure the OAuth consent screen.
2. Create a **Web application** OAuth client.
3. Add `http://localhost:3000` as an authorized JavaScript origin.
4. Add **`http://localhost:3000/api/auth/callback/google`** as an authorized redirect URI.
5. If the consent screen is in testing mode, add your Google account as a test user.

Use the HTTPS equivalents when reviewing a deployment. Auth.js discovers `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL`, and `AUTH_SECRET`, and handles the OAuth callback and CSRF protection for its own actions. Don't enable permissive email account linking or add a credentials provider for the preview.

### OpenAI

- Called only from the server.
- Only the movie title is sent: no profile data, OAuth tokens, or user ID.
- Requests use `store: false`, a 10-second SDK timeout, no automatic retries, and a 220-token output limit.
- `store: false` is not a claim of zero provider retention; review your account's data controls.
- Missing or invalid credentials trigger the same friendly fallback as a provider outage.

## Architecture

![Movie Memory architecture: the browser reaches Next.js pages, which fetch the API routes; the fact service locks the user row in PostgreSQL and calls OpenAI only on a cache miss; Auth.js handles Google sign-in and stores sessions in PostgreSQL.](docs/architecture/architecture.png)

### Pages and sessions

- The server pages `/`, `/onboarding`, and `/dashboard` read a database-backed Auth.js session.

| Visitor | Result |
|---|---|
| Signed out, opening a protected page | Redirected to `/` |
| Signed in, no movie yet | Sent to `/onboarding` |
| Signed in, movie saved | `/` and `/onboarding` lead to `/dashboard` |

- Auth.js's Prisma adapter persists the Google user, account, and opaque session. Logout deletes the session server-side.
- Missing names show “Movie lover” or “there”; missing or broken photos show initials; a missing email is displayed safely.

### API guards

Route handlers `GET /api/me`, `PUT /api/me/movie`, and `GET /api/fact` validate identity on the server.

- The user ID comes **only** from the session. There is no arbitrary-user fact endpoint or client-supplied owner.
- `GET /api/fact` rejects query selectors.
- `PUT /api/me/movie` accepts **only** `{ "movie": "..." }`, and additionally requires an exact `Origin` match and a JSON body.
- Responses are private and `no-store`, so browsers and shared caches never reuse another account's response.
- Titles are trimmed and must be 1–120 UTF-16 code units; blank and control-character input is rejected. One-character titles such as *M* are valid.

### Saving the movie

The movie is a first-time onboarding choice.

- An atomic compare-and-set fills `User.favoriteMovie` only while it is null.
- Repeating the same submission succeeds.
- Conflicting submissions from two tabs produce one winner and a 409; the UI follows that 409 back to the dashboard.
- There is no silent movie-edit contract.

### Data model

| Table | Holds |
|---|---|
| `User`, `Account`, `Session`, `VerificationToken` | The Auth.js adapter contract. A nullable `favoriteMovie` marks incomplete onboarding without a separate flag. |
| `Fact` | Owner, exact saved movie title, generated text, and completion timestamp. |

- The `(userId, movie, createdAt DESC)` index serves the most-recent-fact query.
- Every read filters by both owner and movie, so identical titles across accounts never share a fact.
- There is no organization or workspace tenancy layer.

### Fact generation

The fact service depends on a lock-scoped store and a generation function, which keeps clock and provider tests deterministic. The Prisma store runs one interactive Postgres transaction:

1. Acquire `SELECT ... FOR UPDATE` on the authenticated user's row, using a parameterized query.
2. Read that user's saved movie and latest matching fact **after the lock is held**.
3. Compute the fact's age with Postgres `clock_timestamp()`. It is fresh only when `0 <= age < 60,000 ms`, so exactly 60 seconds expires it. This is a rolling age, not an aligned minute bucket.
4. On a miss, call OpenAI, store the fact with a second database clock reading taken at completion, and commit. Queued callers see that write and return the same fact.
5. If generation fails, return the newest matching saved fact as `source: "stale"`, with a warning and its original timestamp. With no saved fact, return a friendly 503. A storage failure is reported as an error, never as a successful unsaved fact.

**Why this holds under concurrency**

- The lock lives in Postgres, so it works across tabs, requests, and app processes. Different users lock different rows.
- Read Committed isolation is set explicitly, so each statement after a queued lock sees the previous writer's commit.
- No worker or Redis is needed. Postgres releases locks on rollback or disconnection, so there is no stuck process-local flag.

**Time limits**

| Limit | Value |
|---|---|
| Lock wait | 15 s |
| Connection wait | 5 s |
| Transaction deadline | 30 s |
| Route server budget | 40 s (connection wait + transaction deadline) |

Deployment limits must still be reviewed.

### Dashboard behavior

- The dashboard renders the profile and movie first, then fetches the fact.
- Loading, retry, unavailable, and stale-fallback states are all explicit.
- React state holds the current screen's response; the **server owns the 60-second cache**.
- The “New fact” button counts down from the fact's `generatedAt`, so the cache window is visible; the server still decides.
- There is no 30-second client cache or optimistic edit flow.

### Frontend

| Area | Choice |
|---|---|
| Styling | Tailwind CSS 4 on a small token set in `src/app/globals.css` |
| Fonts | Almarai and Instrument Serif, loaded through `next/font` |
| Shared primitives | `Button`, `Badge`, `Alert`, `Poster` in `src/components/ui.tsx` |
| Motion | `framer-motion` for landing and dashboard entrances, isolated in `src/components/motion.tsx` and disabled under `prefers-reduced-motion` |
| Icons | `lucide-react`, for two icons |
| Poster tile | Pure CSS; its hue is derived from the title, so no image service is called |

The landing page's three sections and the `/demo` preview are presentation only. No business logic depends on them; the backend is the substance of this submission.

## API

| Route | Returns |
|---|---|
| `GET /api/fact` | `{ "fact": { "id", "movie", "text", "generatedAt" }, "source" }` |
| `GET /api/me` | `{ "user": { "id", "name", "email", "image", "favoriteMovie" } }` |
| `PUT /api/me/movie` | `{ "movie": "Arrival" }` |

Example `GET /api/fact` response:

```json
{
  "fact": { "id": "...", "movie": "Arrival", "text": "...", "generatedAt": "2026-11-11T00:00:00.000Z" },
  "source": "cache"
}
```

- `source` is `generated`, `cache`, or `stale`; stale results also include `warning`.
- Errors always use `{ "error": { "code": "...", "message": "..." } }`, with status 400, 401, 403, 409, 413, 415, 500, or 503 as appropriate.

See [docs/API.md](docs/API.md) for the full route and error table.

## Testing

### Quick checks

```sh
npm run check                     # lint, TypeScript, deterministic unit tests
npm run build                     # production build
npm audit --audit-level=moderate
```

### Database and browser tests

1. Compose creates `movie_memory_test` on its **first** start. If your Compose volume existed before the test database was added, create it without deleting the volume:

   ```sh
   docker compose exec db createdb -U movie_memory movie_memory_test
   ```

2. Migrate the test database and run the suites:

   ```sh
   export TEST_DATABASE_URL="postgresql://movie_memory:movie_memory@127.0.0.1:5432/movie_memory_test?schema=public"
   DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate
   npm run test:integration
   npx playwright install chromium
   npm run build
   npm run test:e2e
   ```

These commands assume a POSIX shell. On Windows, use WSL or Git Bash, or set the variables in PowerShell.

**Safety and scope**

- Tests refuse any database whose name doesn't end in `_test`.
- They create uniquely prefixed fixture users and remove them afterwards.
- Browser tests start a production server on **127.0.0.1:3100** and insert real Auth.js database sessions as fixtures. There is no app auth bypass.
- They don't exercise Google's live consent/callback or make paid OpenAI calls.

The CI workflow runs the same checks against a disposable Postgres 17 service. The initial migration and its **test-only** rollback rehearsal are described in [docs/DATABASE.md](docs/DATABASE.md). Never point test or rehearsal commands at a live database.

## Tradeoffs and failure modes

| Area | Tradeoff |
|---|---|
| Connection held during the OpenAI call | Keeps concurrency easy to reason about at this scale. A lease/fencing-token worker would raise throughput at larger scale, but adds recovery and stale-writer complexity. |
| Exactly-once billing | The lock guarantees one in-flight generation per user while the transaction lives. It can't guarantee exactly-once remote billing: a crash or network ambiguity after OpenAI responds but before commit can cause a later request to generate again. SDK retries are disabled so one attempt doesn't multiply requests. A sustained outage still causes sequential failed attempts; a circuit breaker would be the next step. |
| Cache identity | Uses the exact saved title. There is no movie catalog or canonical ID; ambiguous titles and AI inaccuracies are acknowledged in the UI and the prompt. Facts render as text, never injected HTML. |
| Retention | Facts are appended, as the exercise requires. No cleanup job or retention period is invented. Account deletion cascades related rows in the schema, but there is no deletion UI. Retention, OAuth token storage/encryption, session lifetime, and deletion policy need owner review before production. |
| Dependencies | Auth.js v5 is pinned to a beta for its App Router integration. Prisma 6 stays on its established client API. Two scoped overrides move the CLI's `deepmerge-ts` and the lint tooling's `minimatch` to patched releases; migration, generation, lint, tests, and build verify compatibility. The lockfile captures the tested tree, and audit results are a point-in-time check. |
| Out of scope | HTTPS/proxy trust, rate limiting, account controls, database pool capacity, migrations, pricing budgets, and deployment approval. |

## With two more hours

1. Run a credentialed Google consent/callback and OpenAI smoke test, including provider timeouts and revocation.
2. Add a per-user failure cooldown and structured, privacy-conscious metrics for cache hits, provider latency, and errors. Agree on spending limits and load-test the connection pool before moving generation to a worker.
3. Agree on retention and account deletion, then add a reviewed cleanup plan and more keyboard and screen-reader checks.

## References

- [Next.js App Router setup](https://nextjs.org/docs/app/getting-started/installation)
- [Auth.js Prisma adapter](https://authjs.dev/getting-started/adapters/prisma) and [Google provider](https://authjs.dev/getting-started/providers/google)
- [Postgres row-level locks](https://www.postgresql.org/docs/17/explicit-locking.html)
- [OpenAI TypeScript SDK: retries/timeouts](https://developers.openai.com/api/reference/typescript) and [Responses create](https://developers.openai.com/api/reference/resources/responses/methods/create)
