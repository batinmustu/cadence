import { describe, expect, it } from "vitest";
import { createIdea } from "./ideas";
import { createPost, type Post } from "./posts";
import { draftPostFor, groupSeriesIdeas } from "./seriesView";

const idea = (title: string) => createIdea({ title });
const post = (ideaId: string, status: Post["status"]): Post => ({
  ...createPost({ ideaId, contentTypeId: "ct" }),
  status,
  scheduledAt: status === "draft" ? null : "2026-11-15T20:00:00.000Z",
});

describe("groupSeriesIdeas", () => {
  it("splits ideas by post status and skips archived ones", () => {
    const a = idea("a");
    const b = idea("b");
    const c = idea("c");
    const d = { ...idea("d"), status: "archived" as const };
    const g = groupSeriesIdeas(
      [a, b, c, d],
      [post(b.id, "scheduled"), post(c.id, "published"), post(a.id, "draft")],
    );
    expect(g.unscheduled.map((i) => i.title)).toEqual(["a"]);
    expect(g.planned.map((i) => i.title)).toEqual(["b"]);
    expect(g.published.map((i) => i.title)).toEqual(["c"]);
  });
});

describe("draftPostFor", () => {
  it("returns the idea's draft or null", () => {
    const a = idea("a");
    const draft = post(a.id, "draft");
    expect(draftPostFor(a.id, [post(a.id, "scheduled"), draft])).toBe(draft);
    expect(draftPostFor(a.id, [])).toBeNull();
  });
});
