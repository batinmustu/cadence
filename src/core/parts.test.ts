import { describe, expect, it } from "vitest";
import { countChars } from "./charCount";
import { splitIntoParts } from "./parts";

describe("splitIntoParts", () => {
  it("returns nothing for blank text", () => {
    expect(splitIntoParts("  \n ", 50)).toEqual([]);
  });
  it("keeps short text in one part", () => {
    expect(splitIntoParts("Hello there. Bye.", 50)).toEqual(["Hello there. Bye."]);
  });
  it("breaks at sentence boundaries", () => {
    expect(splitIntoParts("First one. Second one. Third one.", 22)).toEqual([
      "First one. Second one.",
      "Third one.",
    ]);
  });
  it("cuts an over-long sentence at words", () => {
    const parts = splitIntoParts("alpha beta gamma delta epsilon", 12);
    expect(parts).toEqual(["alpha beta", "gamma delta", "epsilon"]);
  });
  it("cuts an unbroken word by grapheme", () => {
    const parts = splitIntoParts("abcdefghij", 4);
    expect(parts).toEqual(["abcd", "efgh", "ij"]);
  });
  it("respects the X counting rule for links", () => {
    const text = "See https://example.com/a/very/long/path/here now. Done.";
    for (const p of splitIntoParts(text, 40, "x"))
      expect(countChars(p, "x")).toBeLessThanOrEqual(40);
  });
});
