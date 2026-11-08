import { describe, expect, it } from "vitest";
import { PRESET_CONTENT_TYPES } from "../db/seed/presets";
import { type FieldSchema, parseFieldSchema, validateFields } from "./fieldSchema";

const parse = (o: unknown) => parseFieldSchema(JSON.stringify(o));

describe("parseFieldSchema", () => {
  it("accepts every preset schema", () => {
    for (const c of PRESET_CONTENT_TYPES) expect(parse(c.schema).ok).toBe(true);
  });
  it("rejects bad JSON, unknown kinds, duplicates and bad limits", () => {
    expect(parseFieldSchema("{").ok).toBe(false);
    expect(parse({}).ok).toBe(false);
    expect(parse({ fields: [{ key: "a", kind: "image" }] }).ok).toBe(false);
    expect(parse({ fields: [{ kind: "text" }] }).ok).toBe(false);
    expect(
      parse({
        fields: [
          { key: "a", kind: "text" },
          { key: "a", kind: "text" },
        ],
      }).ok,
    ).toBe(false);
    expect(parse({ fields: [{ key: "a", kind: "text", max: -1 }] }).ok).toBe(false);
    expect(parse({ fields: [{ key: "a", kind: "parts", maxParts: 1.5 }] }).ok).toBe(false);
    expect(parse({ fields: [{ key: "a", kind: "checklist" }] }).ok).toBe(false);
  });
  it("keeps label and countRule", () => {
    const r = parse({ fields: [{ key: "a", kind: "text", label: "A", countRule: "x", max: 5 }] });
    expect(r).toEqual({
      ok: true,
      value: { fields: [{ key: "a", kind: "text", label: "A", countRule: "x", max: 5 }] },
    });
  });
});

const schema: FieldSchema = {
  fields: [
    { key: "title", kind: "text", max: 5 },
    { key: "body", kind: "longtext" },
    { key: "thread", kind: "parts", maxPerPart: 3, maxParts: 2 },
    { key: "script", kind: "outline" },
    { key: "todo", kind: "checklist", items: ["Script", "Shoot"] },
  ],
};

describe("validateFields", () => {
  it("passes valid and empty values", () => {
    expect(validateFields(schema, {})).toEqual([]);
    expect(
      validateFields(schema, {
        title: "abc",
        body: "x".repeat(10_000),
        thread: ["abc", "d"],
        script: [{ text: "Intro", timestamp: "0:00" }, { text: "Outro" }],
        todo: { Script: true, Shoot: false },
      }),
    ).toEqual([]);
  });
  it("text: wrong shape and over limit (counts code points)", () => {
    expect(validateFields(schema, { title: 5 })).toEqual([{ key: "title", code: "wrongShape" }]);
    expect(validateFields(schema, { title: "abcdef" })).toEqual([
      { key: "title", code: "overLimit" },
    ]);
    expect(validateFields(schema, { title: "😀😀😀😀😀" })).toEqual([]);
  });
  it("longtext: wrong shape", () => {
    expect(validateFields(schema, { body: ["a"] })).toEqual([{ key: "body", code: "wrongShape" }]);
  });
  it("parts: shape, per-part limit with index, part count", () => {
    expect(validateFields(schema, { thread: "a" })).toEqual([
      { key: "thread", code: "wrongShape" },
    ]);
    expect(validateFields(schema, { thread: ["ab", "abcd"] })).toEqual([
      { key: "thread", code: "overLimit", index: 1 },
    ]);
    expect(validateFields(schema, { thread: ["a", "b", "c"] })).toEqual([
      { key: "thread", code: "tooManyParts" },
    ]);
  });
  it("outline: wrong shape", () => {
    expect(validateFields(schema, { script: ["x"] })).toEqual([
      { key: "script", code: "wrongShape" },
    ]);
    expect(validateFields(schema, { script: [{ text: 1 }] })).toEqual([
      { key: "script", code: "wrongShape" },
    ]);
  });
  it("checklist: shape and unknown items", () => {
    expect(validateFields(schema, { todo: ["Script"] })).toEqual([
      { key: "todo", code: "wrongShape" },
    ]);
    expect(validateFields(schema, { todo: { Script: "yes" } })).toEqual([
      { key: "todo", code: "wrongShape" },
    ]);
    expect(validateFields(schema, { todo: { Edit: true } })).toEqual([
      { key: "todo", code: "unknownItem" },
    ]);
  });
});
