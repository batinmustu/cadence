import { describe, expect, it } from "vitest";
import { normalizeSearch, type SearchItem, searchItems } from "./search";

describe("normalizeSearch", () => {
  it("folds Turkish case and diacritics", () => {
    expect(normalizeSearch("IŞIK")).toBe("isik");
    expect(normalizeSearch("İstanbul")).toBe("istanbul");
    expect(normalizeSearch("Süt  Çay")).toBe("sut cay");
  });
});

const items: SearchItem[] = [
  { kind: "idea", id: "1", label: "Weekly recap", detail: "launch notes" },
  { kind: "idea", id: "2", label: "Launch plan" },
  { kind: "series", id: "3", label: "Monday launch" },
  { kind: "tag", id: "4", label: "ışık" },
];

describe("searchItems", () => {
  it("returns nothing for an empty query", () => {
    expect(searchItems(items, "  ")).toEqual([]);
  });
  it("ranks label prefix over word match over detail match", () => {
    expect(searchItems(items, "launch").map((h) => h.id)).toEqual(["2", "3", "1"]);
  });
  it("requires every term to match", () => {
    expect(searchItems(items, "launch plan").map((h) => h.id)).toEqual(["2"]);
    expect(searchItems(items, "launch zzz")).toEqual([]);
  });
  it("matches Turkish letters typed without diacritics", () => {
    expect(searchItems(items, "ISIK").map((h) => h.id)).toEqual(["4"]);
  });
  it("respects the limit", () => {
    expect(searchItems(items, "l", 2)).toHaveLength(2);
  });
});
