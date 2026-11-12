import { AppError } from "../lib/errors";
import { FACT_CACHE_SECONDS, type FactResult } from "../lib/contracts";

export const CACHE_MS = FACT_CACHE_SECONDS * 1000;
export type StoredFact = { id: string; movie: string; text: string; createdAt: Date };
export interface LockedFacts {
  movie(): Promise<string | null>;
  latest(movie: string): Promise<StoredFact | null>;
  now(): Promise<Date>;
  save(movie: string, text: string, createdAt: Date): Promise<StoredFact>;
}
export interface FactStore {
  withUserLock<T>(userId: string, work: (facts: LockedFacts) => Promise<T>): Promise<T>;
}
export type GenerateFact = (movie: string) => Promise<string>;

function response(fact: StoredFact, source: FactResult["source"], warning?: string): FactResult {
  return {
    fact: { id: fact.id, movie: fact.movie, text: fact.text, generatedAt: fact.createdAt.toISOString() },
    source,
    ...(warning ? { warning } : {}),
  };
}

export function createFactService(store: FactStore, generate: GenerateFact) {
  return async (userId: string): Promise<FactResult> => store.withUserLock(userId, async (facts) => {
    // Read the persisted movie and cache AFTER the lock: queued callers see the winner's write.
    const movie = await facts.movie();
    if (!movie) throw new AppError("ONBOARDING_REQUIRED", "Choose your favorite movie first.", 409);
    const latest = await facts.latest(movie);
    const now = await facts.now();
    const age = latest ? now.getTime() - latest.createdAt.getTime() : Infinity;
    if (latest && age >= 0 && age < CACHE_MS) return response(latest, "cache");

    let text: string;
    try {
      text = (await generate(movie)).trim();
      if (!text || text.length > 1_200) throw new Error("Invalid generated fact");
    } catch {
      if (latest) return response(latest, "stale", "We couldn't refresh this time. Here's your last saved fact.");
      throw new AppError("FACT_UNAVAILABLE", "We couldn’t get a fact right now. Try again in a moment.", 503);
    }
    // Storage failures are not provider failures; don't claim an unsaved fact succeeded.
    const saved = await facts.save(movie, text, await facts.now());
    return response(saved, "generated");
  });
}
