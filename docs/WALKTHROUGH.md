# A 3–5 minute walkthrough

This is a script, not a recorded video. Use `/demo` to show the UI without credentials, then use the configured app to demonstrate the real flow. Read the source before presenting it in your own words.

## 0:00–0:45 — The product

“Movie Memory has one small flow: Google sign-in, a first-time movie choice, and a dashboard with a film fact. I chose Variant A so the implementation concentrates on backend cache and concurrency correctness.”

Show the landing, onboarding, and dashboard. Explain the preview's sample-data banner. In the real app, point out the Google profile, persisted title, logout, initial fact loading, and retry button.

## 0:45–1:30 — Identity and schema

Open `src/auth.ts`, `src/server/session.ts`, and `prisma/schema.prisma`. Explain that Auth.js owns the OAuth protocol and database sessions; the session supplies the immutable user ID. The nullable movie is the onboarding state. The fact belongs to both a user and the saved title, with a latest-fact query index. Missing name/photo is safe. No route trusts a client-provided owner.

## 1:30–2:45 — Cache and concurrency

Open `fact-service.ts` and `prisma-fact-store.ts`. Trace lock → read movie → latest fact → DB clock → age check → provider → save → commit. At 59,999 ms reuse; at 60,000 ms generate. Explain why the cache must be read after the row lock, why the DB clock avoids app-instance clock skew, and why the saved timestamp is read at completion. Refresh never bypasses the server cache.

“Two processes use the same Postgres row lock, so this is not a single-process mutex. Different users don't contend for the same row. The tradeoff is a connection held during a bounded remote call.”

## 2:45–3:30 — Failure and security

Show stale fallback and the preview error control. A failed provider request returns the original most recent fact or a friendly 503; it never marks an old fact fresh. A DB failure never pretends a fact was saved. Secrets are server-only; the prompt gets only the title. Explain no automatic SDK retries and the remaining remote-generation/DB-commit ambiguity. Facts are AI trivia, not verified citations.

## 3:30–4:30 — Evidence and limits

Show `npm run check` and the integration results. The meaningful concurrency test uses 12 calls and two separate connection pools. Browser tests use real Auth.js database session fixtures and check onboarding, redirects, retry, null profile fields, and logout at desktop/mobile widths.

Be explicit: the live Google callback and OpenAI billing path require real credentials; offline tests do not prove them. Discuss the reviewed migration, retention decisions, beta Auth.js dependency, and two more hours of cooldown/telemetry and credentialed tests.

## Questions to be ready for

- Why does a bucket-per-minute unique constraint differ from a rolling 60-second cache?
- What happens if a process dies after OpenAI succeeds but before the DB commits?
- Why use `clock_timestamp()` instead of transaction-start `now()`?
- Why can't Alice get Bob's fact even if their favorite movies are identical?
- How do two onboarding tabs avoid lost writes, and what does retry do?
- What changes before production: token/retention policy, rate limits, pooling, HTTPS/proxy trust, monitoring, and rollout ownership?
