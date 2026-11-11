import { describe, expect, it } from "vitest";
import { parseMovie } from "../../src/lib/movie";

describe("movie validation", () => {
  it("trims titles on the server", () => expect(parseMovie({ movie: "  Arrival  " })).toBe("Arrival"));
  it("accepts real one-character titles", () => expect(parseMovie({ movie: "M" })).toBe("M"));
  it("accepts the maximum length", () => expect(parseMovie({ movie: "x".repeat(120) })).toHaveLength(120));
  it.each(["", "  ", "x".repeat(121), "Movie\nTitle", "Movie\u0000", 12, null, undefined])("rejects an invalid movie: %j", (movie) => {
    expect(() => parseMovie({ movie })).toThrow();
  });
  it("rejects a caller-supplied owner", () => expect(() => parseMovie({ movie: "Arrival", userId: "victim" })).toThrow());
  it.each([null, [], "Arrival", {}])("rejects a malformed body: %j", (body) => expect(() => parseMovie(body)).toThrow());
});
