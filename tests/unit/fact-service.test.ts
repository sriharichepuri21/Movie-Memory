import { describe, expect, it, vi } from "vitest";
import { createFactService, type FactStore, type StoredFact } from "../../src/server/fact-service";

const now = new Date("2026-11-11T00:00:00Z");
function fixture(age: number | null, movie: string | null = "Arrival") {
  const latest: StoredFact | null = age === null ? null : { id: "old", movie: "Arrival", text: "A saved fact", createdAt: new Date(+now - age) };
  const save = vi.fn(async (movie: string, text: string, createdAt: Date) => ({ id: "new", movie, text, createdAt }));
  const latestQuery = vi.fn(async () => latest);
  const lockedIds: string[] = [];
  const store: FactStore = { async withUserLock(userId, work) {
    lockedIds.push(userId);
    return work({ movie: async () => movie, latest: latestQuery, now: async () => now, save });
  } };
  const generate = vi.fn(async () => "A new fact");
  return { store, generate, save, latestQuery, latest, lockedIds };
}

describe("60-second fact cache", () => {
  it.each([0, 59_999])("reuses a fact aged %i ms", async (age) => {
    const f = fixture(age);
    const result = await createFactService(f.store, f.generate)("alice");
    expect(result.source).toBe("cache");
    expect(f.generate).not.toHaveBeenCalled();
    expect(f.save).not.toHaveBeenCalled();
    expect(f.lockedIds).toEqual(["alice"]);
  });
  it.each([60_000, 60_001, -1])("regenerates at or beyond expiry (or future timestamp): %i ms", async (age) => {
    const f = fixture(age);
    const result = await createFactService(f.store, f.generate)("alice");
    expect(result.source).toBe("generated");
    expect(f.generate).toHaveBeenCalledExactlyOnceWith("Arrival");
    expect(f.save).toHaveBeenCalledWith("Arrival", "A new fact", now);
  });
  it("generates and persists the first fact", async () => {
    const f = fixture(null);
    expect((await createFactService(f.store, f.generate)("alice")).source).toBe("generated");
    expect(f.save).toHaveBeenCalledTimes(1);
  });
  it("returns the latest fact on provider failure without refreshing its timestamp", async () => {
    const f = fixture(80_000);
    f.generate.mockRejectedValue(new Error("timeout"));
    const result = await createFactService(f.store, f.generate)("alice");
    expect(result.source).toBe("stale");
    expect(result.fact.generatedAt).toBe(f.latest!.createdAt.toISOString());
    expect(result.warning).toMatch(/couldn't refresh/);
    expect(f.save).not.toHaveBeenCalled();
  });
  it("returns a friendly 503 with no cached fact", async () => {
    const f = fixture(null);
    f.generate.mockRejectedValue(new Error("secret provider error"));
    await expect(createFactService(f.store, f.generate)("alice")).rejects.toMatchObject({ code: "FACT_UNAVAILABLE", status: 503 });
  });
  it.each(["  ", "x".repeat(1201)])("treats unusable provider output as a failure", async (text) => {
    const f = fixture(null);
    f.generate.mockResolvedValue(text);
    await expect(createFactService(f.store, f.generate)("alice")).rejects.toMatchObject({ status: 503 });
    expect(f.save).not.toHaveBeenCalled();
  });
  it("doesn't return success when persistence fails", async () => {
    const f = fixture(80_000);
    f.save.mockRejectedValue(new Error("database down"));
    await expect(createFactService(f.store, f.generate)("alice")).rejects.toThrow("database down");
  });
  it("doesn't call OpenAI before onboarding", async () => {
    const f = fixture(null, null);
    await expect(createFactService(f.store, f.generate)("alice")).rejects.toMatchObject({ code: "ONBOARDING_REQUIRED" });
    expect(f.generate).not.toHaveBeenCalled();
  });
});
