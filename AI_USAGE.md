# AI usage

- I used AI coding assistants (OpenAI Codex and Claude Code) throughout: scaffolding the Next.js, Prisma and Auth.js setup, drafting the fact service, the Postgres row-lock store, the API handlers, the tests, the UI and this documentation.
- I used them to think through the Variant A design: a rolling 60-second window versus a per-minute bucket, `SELECT … FOR UPDATE` on the user row versus a unique constraint, the database clock versus the app clock, and returning the last saved fact when OpenAI fails.
- I used Claude Code to audit the finished project against the exercise PDF, run lint, typecheck, unit tests and the production build, and drive the app on localhost with a database session fixture to confirm redirects, validation, dashboard content and the cache, stale and 503 paths.
- I used Claude Code to redesign the UI from a visual brief I supplied: the type and colour system, the landing page, the dashboard layout, the poster tile and the animation components. I reviewed each screen in the browser and asked for changes until the hierarchy and copy read the way I wanted.
- Official Next.js, Auth.js, Prisma, Postgres and OpenAI documentation was used for API contracts and locking behaviour.
- I reviewed the generated code and documentation before submitting. The schema, cache, concurrency and failure-handling decisions are described in the README.
