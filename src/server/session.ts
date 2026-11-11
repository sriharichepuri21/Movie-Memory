import "server-only";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function currentUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function currentUser() {
  const id = await currentUserId();
  if (!id) return null;
  return db.user.findUnique({ where: { id }, select: {
    id: true, name: true, email: true, image: true, favoriteMovie: true,
  } });
}
