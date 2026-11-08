import { describe, expect, it } from "vitest";
import { localDate, type SeriesRhythm, upcomingSlots, zonedToUtc } from "./series";

const weekly = (weekdays: number[], extra: Partial<SeriesRhythm> = {}): SeriesRhythm => ({
  weekdays,
  time: "09:00",
  frequency: "weekly",
  anchorDate: "2026-01-01",
  ...extra,
});
const range = (a: string, b: string) => [new Date(a), new Date(b)] as const;
const dates = (s: ReturnType<typeof upcomingSlots>) => s.map((x) => x.date);

describe("zonedToUtc", () => {
  it("handles zone offsets", () => {
    expect(new Date(zonedToUtc("2026-01-15", "09:00", "Europe/Istanbul")).toISOString()).toBe(
      "2026-01-15T06:00:00.000Z",
    );
    expect(new Date(zonedToUtc("2026-07-15", "09:00", "Europe/Berlin")).toISOString()).toBe(
      "2026-07-15T07:00:00.000Z",
    );
    expect(new Date(zonedToUtc("2026-01-15", "09:00", "America/New_York")).toISOString()).toBe(
      "2026-01-15T14:00:00.000Z",
    );
  });
  it("keeps the wall time across DST", () => {
    // Berlin springs forward on 2026-03-29, New York on 2026-03-08.
    expect(new Date(zonedToUtc("2026-03-28", "09:00", "Europe/Berlin")).toISOString()).toBe(
      "2026-03-28T08:00:00.000Z",
    );
    expect(new Date(zonedToUtc("2026-03-29", "09:00", "Europe/Berlin")).toISOString()).toBe(
      "2026-03-29T07:00:00.000Z",
    );
    expect(new Date(zonedToUtc("2026-03-08", "09:00", "America/New_York")).toISOString()).toBe(
      "2026-03-08T13:00:00.000Z",
    );
  });
  it("moves a nonexistent time past the gap", () => {
    expect(new Date(zonedToUtc("2026-03-29", "02:30", "Europe/Berlin")).toISOString()).toBe(
      "2026-03-29T01:30:00.000Z",
    );
  });
  it("takes the first of an ambiguous time", () => {
    expect(new Date(zonedToUtc("2026-10-25", "02:30", "Europe/Berlin")).toISOString()).toBe(
      "2026-10-25T00:30:00.000Z",
    );
  });
});

describe("upcomingSlots", () => {
  it("lists weekly weekdays", () => {
    const [a, b] = range("2026-11-02T00:00:00Z", "2026-11-16T00:00:00Z");
    // Mon=1, Wed=3
    expect(dates(upcomingSlots(weekly([1, 3]), [], a, b, "Europe/Istanbul"))).toEqual([
      "2026-11-02",
      "2026-11-04",
      "2026-11-09",
      "2026-11-11",
    ]);
  });
  it("treats 7 as Sunday", () => {
    const [a, b] = range("2026-11-01T00:00:00Z", "2026-11-08T00:00:00Z");
    expect(dates(upcomingSlots(weekly([7]), [], a, b, "UTC"))).toEqual(["2026-11-01"]);
  });
  it("is end-exclusive and start-inclusive on the instant", () => {
    const s = weekly([1]);
    expect(
      upcomingSlots(
        s,
        [],
        new Date("2026-11-02T09:00:00Z"),
        new Date("2026-11-02T09:01:00Z"),
        "UTC",
      ),
    ).toHaveLength(1);
    expect(
      upcomingSlots(
        s,
        [],
        new Date("2026-11-02T08:00:00Z"),
        new Date("2026-11-02T09:00:00Z"),
        "UTC",
      ),
    ).toHaveLength(0);
  });
  it("skips days before the anchor", () => {
    const [a, b] = range("2026-11-01T00:00:00Z", "2026-11-20T00:00:00Z");
    expect(
      dates(upcomingSlots(weekly([1], { anchorDate: "2026-11-09" }), [], a, b, "UTC")),
    ).toEqual(["2026-11-09", "2026-11-16"]);
  });
  it("alternates weeks for biweekly", () => {
    const [a, b] = range("2026-11-01T00:00:00Z", "2026-12-07T00:00:00Z");
    const s = weekly([2], { frequency: "biweekly", anchorDate: "2026-11-03" });
    expect(dates(upcomingSlots(s, [], a, b, "UTC"))).toEqual([
      "2026-11-03",
      "2026-11-17",
      "2026-12-01",
    ]);
  });
  it("picks the first listed weekday of each month for monthly, across month edges", () => {
    const [a, b] = range("2026-10-01T00:00:00Z", "2027-01-01T00:00:00Z");
    const s = weekly([5, 1], { frequency: "monthly", anchorDate: "2026-01-01" });
    // First Friday of Oct, Nov, Dec 2026
    expect(dates(upcomingSlots(s, [], a, b, "UTC"))).toEqual([
      "2026-10-02",
      "2026-11-06",
      "2026-12-04",
    ]);
  });
  it("keeps 09:00 local across the Berlin DST change", () => {
    const [a, b] = range("2026-03-23T00:00:00Z", "2026-04-01T00:00:00Z");
    const slots = upcomingSlots(weekly([0]), [], a, b, "Europe/Berlin");
    expect(slots.map((s) => s.at)).toEqual(["2026-03-29T07:00:00.000Z"]);
    const ny = upcomingSlots(
      weekly([0]),
      [],
      new Date("2026-03-01T00:00:00Z"),
      new Date("2026-03-15T00:00:00Z"),
      "America/New_York",
    );
    expect(ny.map((x) => x.at)).toEqual(["2026-03-01T14:00:00.000Z", "2026-03-08T13:00:00.000Z"]);
  });
  it("uses the local day, not the UTC day, for filled detection", () => {
    const [a, b] = range("2026-11-02T00:00:00Z", "2026-11-03T00:00:00Z");
    // 23:30 New York on Nov 2 is 04:30 UTC on Nov 3: same local day as the 09:00 slot.
    const post = { id: "p1", scheduledAt: "2026-11-03T04:30:00Z" };
    const [slot] = upcomingSlots(weekly([1]), [post], a, b, "America/New_York");
    expect(slot).toMatchObject({ date: "2026-11-02", filled: true, postId: "p1" });
    expect(localDate(post.scheduledAt, "America/New_York")).toBe("2026-11-02");
    const [other] = upcomingSlots(
      weekly([1]),
      [{ id: "p2", scheduledAt: "2026-11-03T15:00:00Z" }],
      a,
      b,
      "America/New_York",
    );
    expect(other?.filled).toBe(false);
  });
  it("ignores unscheduled posts", () => {
    const [a, b] = range("2026-11-02T00:00:00Z", "2026-11-03T00:00:00Z");
    expect(
      upcomingSlots(weekly([1]), [{ id: "x", scheduledAt: null }], a, b, "UTC")[0]?.filled,
    ).toBe(false);
  });
});
