import { describe, expect, it } from "vitest";
import { createPost, parseFields, updatePost } from "./posts";

const now = new Date("2026-11-08T10:00:00Z");
const base = () => createPost({ ideaId: "i", contentTypeId: "c" }, now);

describe("posts core", () => {
  it("creates drafts", () => {
    const p = base();
    expect(p.status).toBe("draft");
    expect(p.fields).toEqual({});
    expect(p.scheduledAt).toBeNull();
  });
  it("requires a date to schedule and clears it when back to draft", () => {
    expect(() => updatePost(base(), { status: "scheduled" })).toThrow();
    const s = updatePost(base(), { status: "scheduled", scheduledAt: "2026-11-10T09:00:00Z" });
    expect(s.scheduledAt).toBe("2026-11-10T09:00:00Z");
    expect(updatePost(s, { status: "draft" }).scheduledAt).toBeNull();
  });
  it("stamps publishedAt when publishing", () => {
    const p = updatePost(base(), { status: "published" }, now);
    expect(p.publishedAt).toBe(now.toISOString());
  });
  it("parses fields defensively", () => {
    expect(parseFields('{"a":"b"}')).toEqual({ a: "b" });
    expect(parseFields("[1]")).toEqual({});
    expect(parseFields("nope")).toEqual({});
  });
});
