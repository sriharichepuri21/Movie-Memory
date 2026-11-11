import type { PrismaClient } from "@prisma/client";
import { AppError } from "../lib/errors";

export async function saveFirstMovie(prisma: PrismaClient, userId: string, movie: string) {
  // Compare-and-set prevents two onboarding tabs from silently overwriting each other.
  const result = await prisma.user.updateMany({
    where: { id: userId, favoriteMovie: null }, data: { favoriteMovie: movie },
  });
  if (result.count) return { movie };
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new AppError("UNAUTHENTICATED", "Please sign in again.", 401);
  if (existing.favoriteMovie === movie) return { movie }; // Same retry is safe.
  throw new AppError("ALREADY_ONBOARDED", "Your favorite movie is already saved. Return to your dashboard.", 409);
}
