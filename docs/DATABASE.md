# Schema and migration review

The migration is the initial, additive schema for this standalone exercise. It was generated from `prisma/schema.prisma`, checked in, and applied only to isolated local databases. There are no existing application rows or tables to migrate. This is a draft for review before any shared or production use.

## Apply

Create the database first. Configure `.env` and run `npm run db:migrate` (`prisma migrate deploy`). The migration creates User, Account, Session, VerificationToken, Fact, foreign keys with cascade deletion, unique identity/session constraints, and the latest-fact index. `npm run db:generate` regenerates the local Prisma client and makes no database changes.

Auth.js uses nullable name, email, and photo. Email uniqueness is not an authorization mechanism; provider account identity and the session establish the user. A nullable movie marks incomplete onboarding. There is no org/workspace model, movie catalog, billing model, or cross-user shared cache.

Facts are append-only in the application. There is no scheduled deletion. Account deletion would cascade facts, sessions, and accounts in this draft schema. These are explicit review points for retention and identity policy before deployment; the app does not expose account deletion.

## Rollback rehearsal (disposable local database only)

Use a new empty database such as `movie_memory_rollback_test`. Never use the development app DB or a shared/live database. `scripts/rollback-initial-test-only.sql` checks the database suffix, drops the five exercise tables, and removes the initial migration record inside one transaction. It is destructive and deliberately refuses non-`_test` database names.

```sh
export DATABASE_URL="postgresql://movie_memory:movie_memory@127.0.0.1:5432/movie_memory_rollback_test?schema=public"
npm run db:migrate
npx prisma db execute --file scripts/rollback-initial-test-only.sql --schema prisma/schema.prisma
npm run db:migrate
npx prisma migrate status
```

This checks apply → rollback → reapply on empty fixtures. In production, prefer a reviewed forward migration and a backup/restore plan that accounts for real data and retention. Do not apply this rehearsal as a production rollback procedure.

