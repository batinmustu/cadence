import { describe, expect, it } from "vitest";
import { checkSchema, fieldKeyFor, moveId, newField, parseHiddenIds } from "./platforms";

describe("moveId", () => {
  it("moves within bounds and ignores the edges", () => {
    expect(moveId(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveId(["a", "b"], "a", -1)).toEqual(["a", "b"]);
    expect(moveId(["a", "b"], "x", 1)).toEqual(["a", "b"]);
  });
});

describe("parseHiddenIds", () => {
  it("tolerates bad input", () => {
    expect(parseHiddenIds(null)).toEqual([]);
    expect(parseHiddenIds("nope")).toEqual([]);
    expect(parseHiddenIds('["a", 1, "b"]')).toEqual(["a", "b"]);
  });
});

describe("fieldKeyFor", () => {
  it("slugs and de-duplicates", () => {
    expect(fieldKeyFor("Video title", [])).toBe("video_title");
    expect(fieldKeyFor("Video title", ["video_title"])).toBe("video_title_2");
    expect(fieldKeyFor("!!!", [])).toBe("field");
  });
});

describe("checkSchema", () => {
  it("accepts a valid schema and trims checklist items", () => {
    const list = newField("checklist", "Steps", []);
    if (list.kind === "checklist") list.items = [" one ", "", "two"];
    const r = checkSchema([newField("text", "Title", []), list]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.schema.fields[1]).toMatchObject({ items: ["one", "two"] });
  });
  it("rejects empty and invalid schemas", () => {
    expect(checkSchema([]).ok).toBe(false);
    expect(checkSchema([{ key: "t", kind: "text", max: -3 }]).ok).toBe(false);
    const a = newField("text", "A", []);
    expect(checkSchema([a, { ...a }]).ok).toBe(false);
  });
});
