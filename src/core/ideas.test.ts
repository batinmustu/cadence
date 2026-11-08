import { describe, expect, it } from "vitest";
import {
  countByFilter,
  createIdea,
  DEFAULT_IDEA_QUERY,
  dateGroupOf,
  deriveIdeaStatus,
  filterIdeasByStatus,
  groupIdeasByDate,
  hasActiveFilters,
  queryIdeas,
  sectionIdeas,
  updateIdea,
} from "./ideas";

const now = new Date(2026, 10, 8, 12, 0, 0);
const daysAgo = (n: number) => new Date(2026, 10, 8 - n, 9, 0, 0);

describe("createIdea / updateIdea", () => {
  it("trims, defaults and dedupes", () => {
    const idea = createIdea({ title: "  Hi  ", platformIds: ["a", "a", "b"] }, now);
    expect(idea.title).toBe("Hi");
    expect(idea.status).toBe("idea");
    expect(idea.platformIds).toEqual(["a", "b"]);
    expect(idea.createdAt).toBe(now.toISOString());
    expect(idea.deletedAt).toBeNull();
  });

  it("update bumps updatedAt and keeps createdAt", () => {
    const idea = createIdea({ title: "x" }, now);
    const later = new Date(now.getTime() + 1000);
    const next = updateIdea(idea, { title: " y ", note: "n" }, later);
    expect(next.title).toBe("y");
    expect(next.note).toBe("n");
    expect(next.createdAt).toBe(idea.createdAt);
    expect(next.updatedAt).toBe(later.toISOString());
  });
});

describe("deriveIdeaStatus", () => {
  it("covers every state", () => {
    expect(deriveIdeaStatus("idea", [])).toBe("idea");
    expect(deriveIdeaStatus("idea", [{ status: "draft" }])).toBe("draft");
    expect(deriveIdeaStatus("draft", [{ status: "draft" }, { status: "scheduled" }])).toBe(
      "planned",
    );
    expect(deriveIdeaStatus("planned", [{ status: "published" }, { status: "published" }])).toBe(
      "published",
    );
    expect(deriveIdeaStatus("planned", [{ status: "published" }, { status: "draft" }])).toBe(
      "draft",
    );
  });
  it("never overrides archived", () => {
    expect(deriveIdeaStatus("archived", [{ status: "published" }])).toBe("archived");
  });
});

describe("grouping and filtering", () => {
  it("assigns date groups", () => {
    expect(dateGroupOf(daysAgo(0).toISOString(), now)).toBe("today");
    expect(dateGroupOf(daysAgo(1).toISOString(), now)).toBe("thisWeek");
    expect(dateGroupOf(daysAgo(6).toISOString(), now)).toBe("thisWeek");
    expect(dateGroupOf(daysAgo(7).toISOString(), now)).toBe("earlier");
  });

  it("groups newest first and omits empty groups", () => {
    const a = createIdea({ title: "a" }, daysAgo(0));
    const b = createIdea({ title: "b" }, daysAgo(20));
    const c = createIdea({ title: "c" }, daysAgo(30));
    const groups = groupIdeasByDate([c, a, b], now);
    expect(groups.map((g) => g.group)).toEqual(["today", "earlier"]);
    expect(groups[1]?.ideas.map((i) => i.title)).toEqual(["b", "c"]);
  });

  it("filters by status; empty filter returns all", () => {
    const a = createIdea({ title: "a" }, now);
    const b = { ...createIdea({ title: "b" }, now), status: "draft" as const };
    expect(filterIdeasByStatus([a, b], ["draft"])).toEqual([b]);
    expect(filterIdeasByStatus([a, b], [])).toHaveLength(2);
  });
});

describe("statusesForFilter", () => {
  it("maps UI filters to statuses", async () => {
    const { statusesForFilter } = await import("./ideas");
    expect(statusesForFilter("all")).toEqual([]);
    expect(statusesForFilter("draft")).toEqual(["idea", "draft"]);
    expect(statusesForFilter("planned")).toEqual(["planned"]);
    expect(statusesForFilter("published")).toEqual(["published"]);
  });
});

describe("queryIdeas", () => {
  const mk = (title: string, d: number, extra: Partial<ReturnType<typeof createIdea>> = {}) => ({
    ...createIdea({ title }, daysAgo(d)),
    ...extra,
  });
  const a = mk("Alpha post", 0, { platformIds: ["x"], tagIds: ["t1"], status: "planned" });
  const b = mk("Beta video", 3, { platformIds: ["yt"], seriesId: "s1", status: "published" });
  const c = mk("Gamma", 20, { note: "about alpha", status: "archived" });
  const all = [b, c, a];
  const q = DEFAULT_IDEA_QUERY;

  it("hides archived by default, newest first", () => {
    expect(queryIdeas(all, q).map((i) => i.title)).toEqual(["Alpha post", "Beta video"]);
  });
  it("combines filters", () => {
    expect(queryIdeas(all, { ...q, platformId: "x", tagId: "t1" })).toEqual([a]);
    expect(queryIdeas(all, { ...q, seriesId: "s1" })).toEqual([b]);
    expect(queryIdeas(all, { ...q, platformId: "x", seriesId: "s1" })).toEqual([]);
  });
  it("text matches title and note, case-insensitive", () => {
    expect(queryIdeas(all, { ...q, text: "ALPHA", status: "all" }).map((i) => i.id)).toEqual([
      a.id,
    ]);
  });
  it("sorts oldest and by planned date", () => {
    expect(queryIdeas(all, { ...q, sort: "oldest" }).map((i) => i.title)).toEqual([
      "Beta video",
      "Alpha post",
    ]);
    const planned = { [b.id]: "2026-12-01T00:00:00Z", [a.id]: "2026-12-05T00:00:00Z" };
    expect(queryIdeas(all, { ...q, sort: "planned" }, planned).map((i) => i.title)).toEqual([
      "Beta video",
      "Alpha post",
    ]);
    expect(queryIdeas(all, { ...q, sort: "planned" }, { [a.id]: "2026-12-05T00:00:00Z" })[0]).toBe(
      a,
    );
  });
  it("counts respect other filters but not status", () => {
    expect(countByFilter(all, q)).toEqual({ all: 2, draft: 0, planned: 1, published: 1 });
    expect(countByFilter(all, { ...q, platformId: "x", status: "published" })).toEqual({
      all: 1,
      draft: 0,
      planned: 1,
      published: 0,
    });
  });
  it("detects active filters", () => {
    expect(hasActiveFilters(q)).toBe(false);
    expect(hasActiveFilters({ ...q, text: " " })).toBe(false);
    expect(hasActiveFilters({ ...q, tagId: "t1" })).toBe(true);
  });
  it("sections by date, series and status", () => {
    const sorted = queryIdeas(all, q, {});
    expect(sectionIdeas(sorted, "date", now).map((s) => s.key)).toEqual(["today", "thisWeek"]);
    expect(sectionIdeas(sorted, "series").map((s) => s.key)).toEqual(["s1", ""]);
    expect(sectionIdeas(sorted, "status").map((s) => s.key)).toEqual(["planned", "published"]);
  });
  it("handles 2000 ideas quickly", () => {
    const many = Array.from({ length: 2000 }, (_, i) => mk(`Idea ${i}`, i % 60));
    const start = performance.now();
    queryIdeas(many, { ...q, text: "idea 1", sort: "planned" });
    countByFilter(many, q);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
