import { describe, expect, it } from "vitest";
import { applyResult, targetField } from "./assist";
import type { FieldSchema } from "./fieldSchema";

const thread: FieldSchema = {
  fields: [{ kind: "parts", key: "tweets", maxPerPart: 280, maxParts: 3 }],
};
const video: FieldSchema = {
  fields: [
    { kind: "text", key: "title", max: 100 },
    { kind: "longtext", key: "description" },
    { kind: "outline", key: "outline" },
  ],
};

describe("targetField", () => {
  it("prefers long text, then parts, then text", () => {
    expect(targetField(video)?.key).toBe("description");
    expect(targetField(thread)?.key).toBe("tweets");
    expect(targetField({ fields: [{ kind: "text", key: "t" }] })?.key).toBe("t");
    expect(targetField({ fields: [{ kind: "outline", key: "o" }] })).toBeNull();
  });
});

describe("applyResult", () => {
  it("replaces long text", () => {
    expect(applyResult(video, { description: "old" }, "replace", " new ")).toEqual({
      key: "description",
      value: "new",
    });
  });
  it("inserts below existing text", () => {
    expect(applyResult(video, { description: "old\n" }, "insertBelow", "new")).toEqual({
      key: "description",
      value: "old\n\nnew",
    });
    expect(applyResult(video, {}, "insertBelow", "new")?.value).toBe("new");
  });
  it("uses a result as the title", () => {
    expect(applyResult(video, { title: "x" }, "use", "Better title")).toEqual({
      key: "title",
      value: "Better title",
    });
  });
  it("falls back to the body field when there is no short text", () => {
    expect(applyResult(thread, {}, "use", "One")?.key).toBe("tweets");
  });
  it("splits blocks into parts, strips numbering and honours maxParts", () => {
    const text = "1/ First\n\n2/ Second\n\n3/ Third\n\n4/ Fourth";
    expect(applyResult(thread, {}, "replace", text)?.value).toEqual(["First", "Second", "Third"]);
  });
  it("appends parts", () => {
    expect(applyResult(thread, { tweets: ["a"] }, "insertBelow", "b")?.value).toEqual(["a", "b"]);
  });
  it("splits an over-long block at the limit", () => {
    const long = `${"word ".repeat(80)}`.trim();
    const value = applyResult(thread, {}, "replace", long)?.value as string[];
    expect(value.length).toBeGreaterThan(1);
    expect(value.every((p) => p.length <= 280)).toBe(true);
  });
  it("ignores empty results and schemas without a body field", () => {
    expect(applyResult(video, {}, "replace", "  ")).toBeNull();
    expect(applyResult({ fields: [] }, {}, "replace", "x")).toBeNull();
  });
});
