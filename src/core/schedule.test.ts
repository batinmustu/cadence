import { describe, expect, it } from "vitest";
import { fromLocalParts, toLocalParts, variantText } from "./schedule";

describe("local date parts", () => {
  it("round-trips through ISO", () => {
    const iso = fromLocalParts("2026-03-04", "09:30");
    expect(iso).not.toBeNull();
    expect(toLocalParts(iso ?? "")).toEqual({ date: "2026-03-04", time: "09:30" });
  });
  it("rejects missing or impossible input", () => {
    expect(fromLocalParts("", "09:30")).toBeNull();
    expect(fromLocalParts("2026-03-04", "")).toBeNull();
    expect(fromLocalParts("2026-02-31", "09:30")).toBeNull();
  });
});

describe("variantText", () => {
  it("joins text-like fields in schema order", () => {
    const schema = {
      fields: [
        { key: "title", kind: "text" as const },
        { key: "t", kind: "parts" as const },
        { key: "s", kind: "outline" as const },
        { key: "c", kind: "checklist" as const, items: ["a"] },
      ],
    };
    expect(
      variantText(schema, {
        title: "Hi",
        t: ["one", "two"],
        s: [{ text: "Intro", timestamp: "0:00" }, { text: "End" }],
        c: { a: true },
      }),
    ).toBe("Hi\n\none\n\ntwo\n\n0:00 Intro\nEnd");
  });
  it("ignores missing and wrong-shaped values", () => {
    expect(variantText({ fields: [{ key: "x", kind: "parts" }] }, { x: 3 })).toBe("");
  });
});
