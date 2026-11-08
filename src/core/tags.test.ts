import { describe, expect, it } from "vitest";
import { normalizeTagName, sameTagName, suggestTags } from "./tags";

const all = [
  { id: "1", name: "launch" },
  { id: "2", name: "behind the scenes" },
  { id: "3", name: "Tips" },
];

describe("tags", () => {
  it("normalizes names", () => {
    expect(normalizeTagName("  #Launch   day ")).toBe("Launch day");
    expect(normalizeTagName("#")).toBe("");
  });
  it("compares case-insensitively", () => {
    expect(sameTagName("Launch", "launch")).toBe(true);
    expect(sameTagName("a", "b")).toBe(false);
  });
  it("suggests prefix matches first and hides chosen tags", () => {
    expect(suggestTags(all, "t").map((t) => t.id)).toEqual(["3", "2"]);
    expect(suggestTags(all, "#la", ["1"])).toEqual([]);
    expect(suggestTags(all, "").length).toBe(3);
  });
});
