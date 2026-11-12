import type { PrismaClient } from "@prisma/client";
import { AppError } from "../lib/errors";
import type { FactStore } from "./fact-service";

export function prismaFactStore(prisma: PrismaClient): FactStore {
  return {
    withUserLock: (userId, work) => prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '15000ms'`;
      // A real database row lock coordinates every process; the authenticated ID is parameterized.
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      if (!rows.length) throw new AppError("UNAUTHENTICATED", "Please sign in again.", 401);
      return work({
        movie: async () => (await tx.user.findUniqueOrThrow({ where: { id: userId } })).favoriteMovie,
        latest: (movie) => tx.fact.findFirst({
          where: { userId, movie },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
        now: async () => (await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`)[0].now,
        save: (movie, text, createdAt) => tx.fact.create({ data: { userId, movie, text, createdAt } }),
      });
    }, { isolationLevel: "ReadCommitted", maxWait: 5_000, timeout: 30_000 }),
  };
}
