import { describe, expect, it } from "vitest";
import type { FieldSchema } from "./fieldSchema";
import { buildPrompt, parseOptions } from "./prompt";

const video: FieldSchema = {
  fields: [
    { key: "title", kind: "text", max: 100 },
    { key: "description", kind: "longtext", max: 5000 },
    { key: "script", kind: "outline" },
    { key: "production", kind: "checklist", items: ["Script", "Shoot"] },
  ],
};
const thread: FieldSchema = { fields: [{ key: "text", kind: "parts", maxPerPart: 280 }] };

describe("buildPrompt", () => {
  it("builds a thread prompt (snapshot)", () => {
    expect(
      buildPrompt({
        tone: "  Warm, short sentences.  ",
        contentTypeName: "Thread",
        schema: thread,
        values: { text: ["Hello world", "Second part"] },
        commandPrompt: "Shorten this.",
        freeText: "Keep the emoji",
      }),
    ).toMatchInlineSnapshot(`
      {
        "prompt": "Shorten this.

      Additional instructions from the user:
      Keep the emoji

      Current content:
      [text]
      1/ Hello world
      2/ Second part",
        "system": "You are a writing assistant inside a social media planning app. Help the user write clear, natural content. Reply with the content only, without preamble or commentary.

      The user's tone of voice:
      Warm, short sentences.

      Content type: Thread. Fields:
      - text: parts (max 280 characters per part)",
      }
    `);
  });

  it("asks for JSON options and skips checklists and empty fields", () => {
    const built = buildPrompt({
      contentTypeName: "Video",
      schema: video,
      values: {
        title: "  ",
        script: [{ text: "Intro", timestamp: "0:00" }],
        production: { Script: true },
      },
      commandPrompt: "Suggest titles.",
      expectsOptions: true,
    });
    expect(built.system).toContain('{"options"');
    expect(built.system).not.toContain("production");
    expect(built.prompt).toContain("[script]\n- [0:00] Intro");
    expect(built.prompt).not.toContain("[title]");
  });

  it("works with only a command", () => {
    const built = buildPrompt({ commandPrompt: "Write a hook." });
    expect(built.prompt).toBe("Write a hook.");
    expect(built.system).not.toContain("tone");
  });
});

describe("parseOptions", () => {
  it("parses the JSON contract", () => {
    expect(parseOptions('{"options": ["a", " b "]}')).toEqual(["a", "b"]);
  });
  it("tolerates code fences and surrounding text", () => {
    expect(parseOptions('```json\n{"options":["x"]}\n```')).toEqual(["x"]);
    expect(parseOptions('Here you go: {"options":["y","z"]} hope it helps')).toEqual(["y", "z"]);
  });
  it("falls back to plain text", () => {
    expect(parseOptions("Just a sentence.")).toEqual(["Just a sentence."]);
    expect(parseOptions('{"options": []}')).toEqual(['{"options": []}']);
    expect(parseOptions("{broken")).toEqual(["{broken"]);
    expect(parseOptions("  ")).toEqual([]);
  });
});
