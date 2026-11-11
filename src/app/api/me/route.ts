import { currentUser } from "@/server/session";
import { handle, json } from "@/server/http";
import { unauthorized } from "@/lib/errors";

export const dynamic = "force-dynamic";
export async function GET() {
  return handle(async () => {
    const user = await currentUser();
    if (!user) unauthorized();
    return json({ user });
  });
}
