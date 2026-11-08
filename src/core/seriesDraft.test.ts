import { describe, expect, it } from "vitest";
import { buildDraftCommand, parseDraft } from "./seriesDraft";

describe("buildDraftCommand", () => {
  it("includes template, description and recent posts", () => {
    const p = buildDraftCommand({
      seriesName: "Sunday tips",
      seriesDescription: "Weekly tips",
      template: "Hook, tip, question",
      recent: ["Old post one", "  ", "Old post two"],
    });
    expect(p).toContain('"Sunday tips"');
    expect(p).toContain("Weekly tips");
    expect(p).toContain("Hook, tip, question");
    expect(p).toContain("1. Old post one\n\n2. Old post two");
    expect(p).toContain("title on the first line");
  });
  it("leaves out empty sections and caps recent posts", () => {
    const p = buildDraftCommand({
      seriesName: "S",
      template: " ",
      recent: Array.from({ length: 9 }, (_, i) => `post ${i}`),
    });
    expect(p).not.toContain("template");
    expect(p).toContain("5. post 4");
    expect(p).not.toContain("6. post 5");
  });
});

describe("parseDraft", () => {
  it("splits title and body", () => {
    expect(parseDraft("## Title: Hello\n\nBody text\nmore")).toEqual({
      title: "Hello",
      body: "Body text\nmore",
    });
  });
  it("uses a one-line answer as both", () => {
    expect(parseDraft("Just one line")).toEqual({ title: "Just one line", body: "Just one line" });
  });
  it("returns null for empty input", () => {
    expect(parseDraft("  \n")).toBeNull();
  });
});
