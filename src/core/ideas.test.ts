import { describe, expect, it } from "vitest";
import {
  countIdeasByStatus,
  createIdea,
  DEFAULT_IDEA_QUERY,
  dateGroupOf,
  deriveIdeaStatus,
  filterIdeasByStatus,
  groupIdeasByDate,
  hasActiveFilters,
  limitGroups,
  parseIdeaSearch,
  queryIdeas,
  serializeIdeaSearch,
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

describe("idea queries", () => {
  const mk = (title: string, day: number, over: Partial<ReturnType<typeof createIdea>> = {}) => ({
    ...createIdea({ title }, daysAgo(day)),
    ...over,
  });
  const a = mk("Alpha post", 3, { platformIds: ["x"], tagIds: ["t1"], status: "draft" });
  const b = mk("Beta video", 2, { platformIds: ["yt"], seriesId: "s1", status: "planned" });
  const c = mk("Gamma", 1, { note: "about alpha", status: "published" });
  const d = mk("Old", 9, { status: "archived" });
  const all = [a, b, c, d];

  it("combines filters and hides archived by default", () => {
    expect(queryIdeas(all, DEFAULT_IDEA_QUERY).map((i) => i.title)).toEqual([
      "Gamma",
      "Beta video",
      "Alpha post",
    ]);
    expect(queryIdeas(all, { ...DEFAULT_IDEA_QUERY, platformId: "x" })).toEqual([a]);
    expect(queryIdeas(all, { ...DEFAULT_IDEA_QUERY, seriesId: "s1" })).toEqual([b]);
    expect(queryIdeas(all, { ...DEFAULT_IDEA_QUERY, tagId: "t1", status: "draft" })).toEqual([a]);
    expect(queryIdeas(all, { ...DEFAULT_IDEA_QUERY, text: "ALPHA" })).toEqual([c, a]);
    expect(queryIdeas(all, { ...DEFAULT_IDEA_QUERY, text: "alpha", platformId: "x" })).toEqual([a]);
  });

  it("sorts newest, oldest and by planned date (unplanned last)", () => {
    const q = DEFAULT_IDEA_QUERY;
    expect(queryIdeas(all, { ...q, sort: "oldest" }).map((i) => i.title)).toEqual([
      "Alpha post",
      "Beta video",
      "Gamma",
    ]);
    const planned = { [a.id]: "2026-12-01T00:00:00Z", [c.id]: "2026-11-20T00:00:00Z" };
    expect(queryIdeas(all, { ...q, sort: "planned" }, planned).map((i) => i.title)).toEqual([
      "Gamma",
      "Alpha post",
      "Beta video",
    ]);
  });

  it("counts statuses with the other filters applied", () => {
    expect(countIdeasByStatus(all, DEFAULT_IDEA_QUERY)).toEqual({
      all: 3,
      draft: 1,
      planned: 1,
      published: 1,
    });
    expect(countIdeasByStatus(all, { ...DEFAULT_IDEA_QUERY, text: "alpha" }).all).toBe(2);
  });

  it("round-trips URL search params and ignores junk", () => {
    const q = { ...DEFAULT_IDEA_QUERY, status: "planned" as const, tagId: "t1", text: "hi" };
    expect(parseIdeaSearch(serializeIdeaSearch(q))).toEqual(q);
    expect(serializeIdeaSearch(DEFAULT_IDEA_QUERY)).toEqual({});
    expect(parseIdeaSearch({ status: "nope", sort: 3, q: 5 })).toEqual(DEFAULT_IDEA_QUERY);
    expect(hasActiveFilters(DEFAULT_IDEA_QUERY)).toBe(false);
    expect(hasActiveFilters(q)).toBe(true);
  });

  it("limits across groups and stays fast for 2,000 ideas", () => {
    const many = Array.from({ length: 2000 }, (_, n) =>
      mk(`Idea ${n}`, n % 60, { platformIds: n % 2 ? ["x"] : [], tagIds: n % 3 ? ["t1"] : [] }),
    );
    const t0 = performance.now();
    const found = queryIdeas(many, { ...DEFAULT_IDEA_QUERY, platformId: "x", text: "idea 1" });
    const groups = groupIdeasByDate(found, now, true);
    countIdeasByStatus(many, DEFAULT_IDEA_QUERY);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(250);
    const limited = limitGroups(groupIdeasByDate(many, now), 100);
    expect(limited.reduce((n, g) => n + g.ideas.length, 0)).toBe(100);
    expect(groups.length).toBeGreaterThan(0);
  });
});
