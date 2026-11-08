import { describe, expect, it } from "vitest";
import type { ScheduledNotification } from "../platform/types";
import { diffReminders, planReminders } from "./reminders";
import { createSeries } from "./series";

const texts = { title: (n: string) => `T ${n}`, body: (n: string) => `B ${n}` };
const now = new Date("2026-03-02T08:00:00Z"); // Monday
const make = (over = {}) =>
  createSeries(
    {
      name: "Weekly",
      platformId: "p",
      weekdays: [3],
      time: "09:00",
      anchorDate: "2026-01-01",
      remindBeforeHours: 24,
      ...over,
    },
    now,
  );

describe("planReminders", () => {
  it("reminds before an empty slot", () => {
    const s = make();
    const r = planReminders([s], new Map(), now, "UTC", texts);
    expect(r[0]?.at).toBe("2026-03-03T09:00:00.000Z");
    expect(r[0]?.id).toBe(`series:${s.id}:2026-03-04T09:00:00.000Z`);
    expect(r[0]?.title).toBe("T Weekly");
  });

  it("skips filled slots, disabled reminders, deleted series and past reminders", () => {
    const s = make();
    const filled = new Map([[s.id, [{ id: "x", scheduledAt: "2026-03-04T10:00:00Z" }]]]);
    const ids = planReminders([s], filled, now, "UTC", texts).map((n) => n.at);
    expect(ids).not.toContain("2026-03-03T09:00:00.000Z");
    expect(planReminders([make({ remindBeforeHours: 0 })], new Map(), now, "UTC", texts)).toEqual(
      [],
    );
    expect(planReminders([{ ...s, deletedAt: "x" }], new Map(), now, "UTC", texts)).toEqual([]);
    // Reminder time (Mar 3 09:00 minus nothing) already passed for a slot tomorrow morning.
    const late = new Date("2026-03-03T12:00:00Z");
    const r = planReminders([s], new Map(), late, "UTC", texts);
    expect(r.every((n) => n.at > late.toISOString())).toBe(true);
    expect(r.some((n) => n.id.endsWith("2026-03-04T09:00:00.000Z"))).toBe(false);
  });

  it("stays within the horizon", () => {
    const r = planReminders([make()], new Map(), now, "UTC", texts);
    expect(r.length).toBe(2);
  });
});

describe("diffReminders", () => {
  const n = (id: string, at: string): ScheduledNotification => ({ id, title: "t", body: "b", at });
  it("cancels removed, schedules new and changed", () => {
    const prev = new Map([
      ["a", n("a", "1")],
      ["b", n("b", "2")],
      ["c", n("c", "3")],
    ]);
    const d = diffReminders(prev, [n("a", "1"), n("b", "9"), n("d", "4")]);
    expect(d.cancel).toEqual(["c"]);
    expect(d.schedule.map((x) => x.id)).toEqual(["b", "d"]);
  });
});
