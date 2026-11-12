import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createFactService } from "../../src/server/fact-service";
import { prismaFactStore } from "../../src/server/prisma-fact-store";
import { saveFirstMovie } from "../../src/server/movies";
import { factHandler, movieHandler } from "../../src/server/http";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Set TEST_DATABASE_URL to a separate Postgres database whose name ends in _test; see README.");
}
const db = new PrismaClient({ datasources: { db: { url } } });
const db2 = new PrismaClient({ datasources: { db: { url } } });
const prefix = `integration-${randomUUID()}`;
const alice = `${prefix}-alice`;
const bob = `${prefix}-bob`;
const newbie = `${prefix}-new`;

beforeAll(async () => {
  await db.user.createMany({ data: [
    { id: alice, favoriteMovie: "Arrival" },
    { id: bob, favoriteMovie: "Arrival" },
    { id: newbie },
  ] });
});
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { startsWith: prefix } } });
  await Promise.all([db.$disconnect(), db2.$disconnect()]);
});

describe("real Postgres correctness", () => {
  it("coalesces a burst across independent Prisma connection pools", async () => {
    const generate = vi.fn(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); return "Only one provider call"; });
    const a = createFactService(prismaFactStore(db), generate);
    const b = createFactService(prismaFactStore(db2), generate);
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => (i % 2 ? a : b)(alice)));
    expect(generate).toHaveBeenCalledTimes(1);
    expect(new Set(results.map((r) => r.fact.id)).size).toBe(1);
    expect(results.filter((r) => r.source === "generated")).toHaveLength(1);
    expect(await db.fact.count({ where: { userId: alice } })).toBe(1);
  });
  it("doesn't reuse a different user's same-movie cache", async () => {
    const generate = vi.fn(async () => "Bob's private fact");
    const response = await factHandler(async () => bob, createFactService(prismaFactStore(db), generate))(new Request("http://localhost/api/fact"));
    const body = await response.json();
    expect(body.fact.text).toBe("Bob's private fact");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await db.fact.count({ where: { userId: bob } })).toBe(1);
  });
  it("blocks cross-user selectors against real storage", async () => {
    const service = createFactService(prismaFactStore(db), vi.fn());
    const response = await factHandler(async () => alice, service)(new Request(`http://localhost/api/fact?userId=${bob}`));
    expect(response.status).toBe(400);
    expect(await db.fact.count({ where: { userId: bob } })).toBe(1);
  });
  it("regenerates an expired cache and persists a second row", async () => {
    await db.fact.updateMany({ where: { userId: alice }, data: { createdAt: new Date(Date.now() - 61_000) } });
    const generate = vi.fn(async () => "A refreshed fact");
    const response = await createFactService(prismaFactStore(db), generate)(alice);
    expect(response.source).toBe("generated");
    expect(await db.fact.count({ where: { userId: alice } })).toBe(2);
  });
  it("returns the newest cached fact after an OpenAI failure", async () => {
    await db.fact.updateMany({ where: { userId: alice }, data: { createdAt: new Date(Date.now() - 61_000) } });
    // Give the latest row a deterministic ordering distinct from the earlier one.
    const expected = await db.fact.create({ data: { userId: alice, movie: "Arrival", text: "Newest saved", createdAt: new Date(Date.now() - 60_100) } });
    const response = await createFactService(prismaFactStore(db), async () => { throw new Error("timeout"); })(alice);
    expect(response.source).toBe("stale");
    expect(response.fact.id).toBe(expected.id);
    expect(await db.fact.count({ where: { userId: alice } })).toBe(3);
  });
  it("releases the row lock after failure and permits the next request", async () => {
    await expect(createFactService(prismaFactStore(db2), async () => { throw new Error("provider down"); })(newbie)).rejects.toMatchObject({ code: "ONBOARDING_REQUIRED" });
    await saveFirstMovie(db, newbie, "M");
    await expect(createFactService(prismaFactStore(db2), async () => { throw new Error("provider down"); })(newbie)).rejects.toMatchObject({ status: 503 });
    const result = await createFactService(prismaFactStore(db), async () => "Recovered")(newbie);
    expect(result.fact.text).toBe("Recovered");
  });
  it("doesn't leak data for a deleted or unknown session user", async () => {
    await expect(createFactService(prismaFactStore(db), vi.fn())(`${prefix}-missing`)).rejects.toMatchObject({ status: 401 });
  });
  it("atomically saves only one first movie and makes identical retries safe", async () => {
    const id = `${prefix}-onboarding`;
    await db.user.create({ data: { id } });
    const results = await Promise.allSettled([saveFirstMovie(db, id, "Alien"), saveFirstMovie(db2, id, "Arrival")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toMatchObject([{ reason: { status: 409 } }]);
    const user = await db.user.findUniqueOrThrow({ where: { id } });
    await expect(saveFirstMovie(db, id, user.favoriteMovie!)).resolves.toEqual({ movie: user.favoriteMovie });
  });
  it("a malicious movie write cannot modify Bob", async () => {
    const request = new Request("http://localhost:3000/api/me/movie", { method: "PUT", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ movie: "Changed", userId: bob }) });
    const response = await movieHandler(async () => alice, (id, movie) => saveFirstMovie(db, id, movie))(request);
    expect(response.status).toBe(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: bob } })).favoriteMovie).toBe("Arrival");
  });
  it("rolls back failed writes and cascades only the deleted user's data", async () => {
    const id = `${prefix}-rollback`;
    await db.user.create({ data: { id, favoriteMovie: "Alien" } });
    await expect(db.$transaction(async (tx) => {
      await tx.fact.create({ data: { userId: id, movie: "Alien", text: "Must not persist" } });
      throw new Error("rollback");
    })).rejects.toThrow("rollback");
    expect(await db.fact.count({ where: { userId: id } })).toBe(0);
    await db.fact.create({ data: { userId: id, movie: "Alien", text: "Delete with user" } });
    await db.user.delete({ where: { id } });
    expect(await db.fact.count({ where: { userId: id } })).toBe(0);
    expect(await db.fact.count({ where: { userId: bob } })).toBe(1);
  });
});
