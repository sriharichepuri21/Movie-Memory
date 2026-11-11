-- Destructive rehearsal for a DISPOSABLE *_test database only.
-- Production schema changes need an owner-approved, forward migration.
BEGIN;
DO $$
BEGIN
  IF right(current_database(), 5) <> '_test' THEN
    RAISE EXCEPTION 'Rollback rehearsal is restricted to disposable *_test databases';
  END IF;
END $$;
DROP TABLE "Fact";
DROP TABLE "Session";
DROP TABLE "Account";
DROP TABLE "VerificationToken";
DROP TABLE "User";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261111000000_init';
COMMIT;
