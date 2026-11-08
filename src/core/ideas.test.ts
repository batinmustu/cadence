import { describe, expect, it } from "vitest";
import {
  createIdea,
  dateGroupOf,
  deriveIdeaStatus,
  filterIdeasByStatus,
  groupIdeasByDate,
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
