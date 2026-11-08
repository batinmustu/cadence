import { beforeEach, describe, expect, it } from "vitest";
import { prepareDatabase } from "../../db";
import { createSeriesRepository } from "../../db/repositories/series";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { Database, ScheduledNotification } from "../../platform/types";
import { createReminderSync } from "./reminderSync";

const now = new Date("2026-03-02T08:00:00Z");

describe("reminder sync", () => {
  let db: Database;
  let live: Map<string, ScheduledNotification>;
  let sync: ReturnType<typeof createReminderSync>;

  beforeEach(async () => {
    db = await createSqlJsDatabase();
    await prepareDatabase(db);
    live = new Map();
    sync = createReminderSync(
      db,
      {
        async schedule(n) {
          live.set(n.id, n);
        },
        async cancel(id) {
          live.delete(id);
        },
      },
      () => now,
    );
  });

  async function addSeries(remind: number) {
    const [p] = await db.select<{ id: string }>("SELECT id FROM platforms LIMIT 1");
    const repo = createSeriesRepository(db, () => now);
    return repo.create({
      name: "Weekly",
      platformId: p?.id ?? "",
      weekdays: [3],
      time: "09:00",
      anchorDate: "2026-01-01",
      remindBeforeHours: remind,
    });
  }

  it("schedules, then cancels when the reminder is turned off", async () => {
    const s = await addSeries(24);
    await sync.sync();
    expect(live.size).toBeGreaterThan(0);
    await createSeriesRepository(db, () => now).update(s.id, {
      remindBeforeHours: 0,
    });
    await sync.sync();
    expect(live.size).toBe(0);
  });

  it("schedules nothing without reminder hours", async () => {
    await addSeries(0);
    await sync.sync();
    expect(live.size).toBe(0);
  });
});
