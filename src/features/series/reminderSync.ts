import { diffReminders, planReminders } from "../../core/reminders";
import type { SeriesPost } from "../../core/series";
import { createSeriesRepository } from "../../db/repositories/series";
import i18n from "../../i18n";
import type { Database, Notifications, ScheduledNotification } from "../../platform/types";

/**
 * Keeps scheduled reminders in line with the database. It remembers what it scheduled
 * itself, so each run only cancels and schedules the difference.
 */
export function createReminderSync(
  db: Database,
  notifications: Notifications,
  clock: () => Date = () => new Date(),
) {
  const scheduled = new Map<string, ScheduledNotification>();
  let running: Promise<void> = Promise.resolve();

  async function run(): Promise<void> {
    const repo = createSeriesRepository(db, clock);
    const series = (await repo.list()).filter((s) => s.remindBeforeHours > 0);
    const postsBySeries = new Map<string, SeriesPost[]>();
    for (const s of series) {
      const posts = await repo.listPosts(s.id);
      postsBySeries.set(
        s.id,
        posts.map((p) => ({ id: p.id, scheduledAt: p.scheduledAt })),
      );
    }
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const next = planReminders(series, postsBySeries, clock(), timeZone, {
      title: (name) => i18n.t("reminders.title", { name }),
      body: (name, slotAt) =>
        i18n.t("reminders.body", {
          name,
          when: slotAt.toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" }),
        }),
    });
    const { cancel, schedule } = diffReminders(scheduled, next);
    for (const id of cancel) {
      await notifications.cancel(id);
      scheduled.delete(id);
    }
    for (const n of schedule) {
      await notifications.schedule(n);
      scheduled.set(n.id, n);
    }
  }

  return {
    /** Runs are queued so two overlapping syncs never interleave. Errors are swallowed: reminders are best effort. */
    sync(): Promise<void> {
      running = running.then(run).catch(() => {});
      return running;
    },
  };
}

const DEBOUNCE_MS = 1000;
/** Re-plan now and then so the rolling horizon keeps moving while the app stays open. */
const REFRESH_MS = 6 * 3_600_000;

/** Plans reminders now and keeps them current. Returns a stop function. */
export function startReminders(
  db: Database,
  notifications: Notifications,
  onWritten: (listener: () => void) => () => void,
): () => void {
  const reminders = createReminderSync(db, notifications);
  let timer: ReturnType<typeof setTimeout> | undefined;
  void reminders.sync();
  const off = onWritten(() => {
    clearTimeout(timer);
    timer = setTimeout(() => void reminders.sync(), DEBOUNCE_MS);
  });
  const interval = setInterval(() => void reminders.sync(), REFRESH_MS);
  return () => {
    off();
    clearTimeout(timer);
    clearInterval(interval);
  };
}
