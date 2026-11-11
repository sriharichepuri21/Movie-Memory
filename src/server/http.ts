import { AppError, unauthorized } from "../lib/errors";
import type { FactResult } from "../lib/contracts";
import { parseMovie } from "../lib/movie";

type Identity = () => Promise<string | null>;
export const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders });
}

export async function handle(work: () => Promise<Response>) {
  try { return await work(); }
  catch (error) {
    if (error instanceof AppError) return json({ error: { code: error.code, message: error.message } }, error.status);
    // Never log OAuth tokens, user profiles, titles, model output, or connection strings.
    console.error("request_failed", { kind: error instanceof Error ? error.name : "UnknownError" });
    return json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again in a moment." } }, 500);
  }
}

export function factHandler(identity: Identity, getFact: (userId: string) => Promise<FactResult>) {
  return (request: Request) => handle(async () => {
    const userId = await identity();
    if (!userId) unauthorized();
    // No caller-supplied user/movie selector. Reject rather than accidentally honor one later.
    if ([...new URL(request.url).searchParams].length) throw new AppError("INVALID_QUERY", "This endpoint uses your signed-in account and saved movie.", 400);
    return json(await getFact(userId));
  });
}

export function movieHandler(identity: Identity, save: (userId: string, movie: string) => Promise<unknown>) {
  return (request: Request) => handle(async () => {
    const userId = await identity();
    if (!userId) unauthorized();
    // Session cookies authenticate requests; exact-origin checks protect this JSON mutation from CSRF.
    const origin = request.headers.get("origin");
    const expected = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).origin : new URL(request.url).origin;
    if (!origin || origin !== expected) throw new AppError("FORBIDDEN", "Please submit this form from Movie Memory.", 403);
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new AppError("INVALID_BODY", "Send a JSON movie title.", 415);
    const raw = await request.text();
    if (raw.length > 2_048) throw new AppError("INVALID_BODY", "The movie title is too long.", 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { throw new AppError("INVALID_BODY", "That request could not be read. Please try again.", 400); }
    return json(await save(userId, parseMovie(body)));
  });
}
