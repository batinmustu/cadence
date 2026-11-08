import { describe, expect, it } from "vitest";
import { groupByMonth, type PublishedItem } from "./published";

const item = (id: string, publishedAt: string): PublishedItem => ({
  postId: id,
  ideaId: id,
  title: id,
  platformId: "p",
  platformName: "X",
  seriesId: null,
  seriesName: null,
  publishedAt,
  fieldSchema: "{}",
  fields: "{}",
});

describe("groupByMonth", () => {
  it("groups consecutive items by local month", () => {
    const a = new Date(2026, 10, 20, 12).toISOString();
    const b = new Date(2026, 10, 2, 12).toISOString();
    const c = new Date(2026, 9, 30, 12).toISOString();
    const groups = groupByMonth([item("a", a), item("b", b), item("c", c)]);
    expect(groups.map((g) => [g.month, g.items.length])).toEqual([
      ["2026-11", 2],
      ["2026-10", 1],
    ]);
  });
  it("is empty for no items", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});
