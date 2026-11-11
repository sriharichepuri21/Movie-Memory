import { afterEach, describe, expect, it, vi } from "vitest";
import { factHandler, handle, movieHandler } from "../../src/server/http";
import type { FactResult } from "../../src/lib/contracts";

const result: FactResult = { fact: { id: "a", movie: "Arrival", text: "Alice's fact", generatedAt: new Date(0).toISOString() }, source: "cache" };
function request(body: unknown = { movie: " Arrival " }, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/me/movie", { method: "PUT", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
}
afterEach(() => vi.unstubAllEnvs());

describe("HTTP authorization and validation", () => {
  it("denies anonymous fact requests before reading data", async () => {
    const get = vi.fn();
    const response = await factHandler(async () => null, get)(new Request("http://localhost/api/fact"));
    expect(response.status).toBe(401);
    expect(get).not.toHaveBeenCalled();
  });
  it("reads only the authenticated user's fact", async () => {
    const get = vi.fn(async () => result);
    const response = await factHandler(async () => "alice", get)(new Request("http://localhost/api/fact"));
    expect(get).toHaveBeenCalledExactlyOnceWith("alice");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual(result);
  });
  it.each(["userId=bob", "movie=Alien", "id=bob-fact"])("rejects fact selectors: %s", async (query) => {
    const get = vi.fn();
    const response = await factHandler(async () => "alice", get)(new Request(`http://localhost/api/fact?${query}`));
    expect(response.status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });
  it("denies anonymous writes", async () => {
    const save = vi.fn();
    expect((await movieHandler(async () => null, save)(request())).status).toBe(401);
    expect(save).not.toHaveBeenCalled();
  });
  it("writes the trimmed movie for the session owner", async () => {
    const save = vi.fn(async () => ({ movie: "Arrival" }));
    const response = await movieHandler(async () => "alice", save)(request());
    expect(response.status).toBe(200);
    expect(save).toHaveBeenCalledExactlyOnceWith("alice", "Arrival");
  });
  it("rejects attempts to change another user's movie", async () => {
    const save = vi.fn();
    expect((await movieHandler(async () => "alice", save)(request({ movie: "Alien", userId: "bob" }))).status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });
  it("rejects cross-origin writes", async () => {
    const save = vi.fn();
    expect((await movieHandler(async () => "alice", save)(request({ movie: "Alien" }, "https://evil.example"))).status).toBe(403);
    expect(save).not.toHaveBeenCalled();
  });
  it("uses configured AUTH_URL as the trusted origin", async () => {
    vi.stubEnv("AUTH_URL", "https://movies.example");
    const save = vi.fn(async () => ({}));
    expect((await movieHandler(async () => "alice", save)(request({ movie: "Alien" }, "https://movies.example"))).status).toBe(200);
  });
  it("rejects missing origin", async () => {
    const req = request(); req.headers.delete("origin");
    expect((await movieHandler(async () => "alice", vi.fn())(req)).status).toBe(403);
  });
  it("rejects non-JSON requests", async () => {
    const req = request(); req.headers.set("content-type", "text/plain");
    expect((await movieHandler(async () => "alice", vi.fn())(req)).status).toBe(415);
  });
  it("handles broken JSON", async () => {
    const req = new Request("http://localhost:3000/api/me/movie", { method: "PUT", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: "{" });
    expect((await movieHandler(async () => "alice", vi.fn())(req)).status).toBe(400);
  });
  it("rejects an oversized body", async () => {
    expect((await movieHandler(async () => "alice", vi.fn())(request({ movie: "x".repeat(3000) }))).status).toBe(413);
  });
  it("doesn't expose internal exception details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handle(async () => { throw new Error("postgres://secret"); });
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
    log.mockRestore();
  });
});
