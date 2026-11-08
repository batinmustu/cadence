import { describe, expect, it } from "vitest";
import {
  buildCalendarItems,
  type CalendarItem,
  fillableSlots,
  groupByDate,
  monthGrid,
  shiftMonth,
} from "./calendar";

describe("monthGrid", () => {
  it("can start on Sunday", () => {
    const g = monthGrid({ year: 2026, month: 10 }, "sunday"); // November 2026 starts on a Sunday
    expect(g[0]?.date).toBe("2026-11-01");
    expect(g).toHaveLength(42);
    expect(monthGrid({ year: 2026, month: 11 }, "sunday")[0]?.date).toBe("2026-11-29");
  });
  it("has 42 Monday-first days covering the month", () => {
    const g = monthGrid({ year: 2026, month: 10 }); // November 2026 starts on a Sunday
    expect(g).toHaveLength(42);
    expect(g[0]?.date).toBe("2026-10-26");
    expect(g[6]?.date).toBe("2026-11-01");
    expect(g.filter((d) => d.inMonth)).toHaveLength(30);
  });
  it("starts on the 1st when the month starts on Monday", () => {
    expect(monthGrid({ year: 2026, month: 5 })[0]?.date).toBe("2026-06-01");
  });
});

describe("shiftMonth", () => {
  it("wraps years in both directions", () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe("buildCalendarItems", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const post = (o: object) => ({
    id: "p",
    ideaId: "i",
    title: "T",
    status: "scheduled" as const,
    scheduledAt: "2026-11-12T09:00:00Z",
    publishedAt: null,
    ...o,
  });

  it("skips drafts, keeps planned and published", () => {
    const items = buildCalendarItems(
      [
        post({ id: "a", status: "draft" }),
        post({ id: "b" }),
        post({ id: "c", status: "published", publishedAt: "2026-11-02T08:00:00Z" }),
      ],
      [],
      now,
      "UTC",
    );
    expect(items.map((i) => [i.key, i.kind, i.date])).toEqual([
      ["post-c", "published", "2026-11-02"],
      ["post-b", "planned", "2026-11-12"],
    ]);
  });

  it("shows only future empty slots", () => {
    const items = buildCalendarItems(
      [],
      [
        { seriesId: "s", seriesName: "S", at: "2026-11-09T09:00:00Z", filled: false },
        { seriesId: "s", seriesName: "S", at: "2026-11-16T09:00:00Z", filled: false },
        { seriesId: "s", seriesName: "S", at: "2026-11-23T09:00:00Z", filled: true },
      ],
      now,
      "UTC",
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "empty", seriesId: "s", date: "2026-11-16" });
  });

  it("uses the local day of the zone", () => {
    const [i] = buildCalendarItems(
      [post({ scheduledAt: "2026-11-12T22:30:00Z" })],
      [],
      now,
      "Europe/Istanbul",
    );
    expect(i?.date).toBe("2026-11-13");
  });

  it("groups by date", () => {
    const items = buildCalendarItems([post({ id: "a" }), post({ id: "b" })], [], now, "UTC");
    expect(groupByDate(items).get("2026-11-12")).toHaveLength(2);
  });
});

describe("fillableSlots", () => {
  const item = (
    key: string,
    kind: CalendarItem["kind"],
    at: string,
    date: string,
  ): CalendarItem => ({
    key,
    kind,
    date,
    at,
    label: key,
    ideaId: null,
    seriesId: "s1",
  });
  it("keeps future empty slots inside the grid, sorted", () => {
    const items = [
      item("late", "empty", "2030-01-20T09:00:00Z", "2030-01-20"),
      item("past", "empty", "2020-01-05T09:00:00Z", "2020-01-05"),
      item("planned", "planned", "2030-01-10T09:00:00Z", "2030-01-10"),
      item("outside", "empty", "2030-03-01T09:00:00Z", "2030-03-01"),
      item("early", "empty", "2030-01-08T09:00:00Z", "2030-01-08"),
    ];
    const got = fillableSlots(items, "2029-12-30", "2030-02-09", new Date("2025-01-01T00:00:00Z"));
    expect(got.map((i) => i.key)).toEqual(["early", "late"]);
    expect(
      fillableSlots(items, "2029-12-30", "2030-02-09", new Date("2030-01-15T00:00:00Z")),
    ).toHaveLength(1);
  });
});
