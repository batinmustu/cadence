import type { ScheduledNotification } from "../platform/types";
import { type Series, type SeriesPost, upcomingSlots } from "./series";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Timers cap near 24.8 days, so reminders are only planned this far ahead; each re-plan extends it. */
export const REMINDER_HORIZON_DAYS = 14;

export interface ReminderTexts {
  title: (seriesName: string) => string;
  body: (seriesName: string, slotAt: Date) => string;
}

/**
 * Notifications for the empty slots of series that ask for a reminder.
 * The id is stable per series and slot so a re-plan can cancel exactly what changed.
 */
export function planReminders(
  series: Series[],
  postsBySeries: Map<string, SeriesPost[]>,
  now: Date,
  timeZone: string,
  texts: ReminderTexts,
): ScheduledNotification[] {
  const out: ScheduledNotification[] = [];
  const to = new Date(now.getTime() + REMINDER_HORIZON_DAYS * DAY_MS);
  for (const s of series) {
    if (s.deletedAt || s.remindBeforeHours <= 0) continue;
    // Look past the horizon: a slot beyond it may still have its reminder inside it.
    const slots = upcomingSlots(
      s,
      postsBySeries.get(s.id) ?? [],
      now,
      new Date(to.getTime() + s.remindBeforeHours * HOUR_MS),
      timeZone,
    );
    for (const slot of slots) {
      if (slot.filled) continue;
      const at = new Date(new Date(slot.at).getTime() - s.remindBeforeHours * HOUR_MS);
      // A reminder already in the past is skipped rather than fired late.
      if (at.getTime() <= now.getTime() || at.getTime() > to.getTime()) continue;
      out.push({
        id: `series:${s.id}:${slot.at}`,
        title: texts.title(s.name),
        body: texts.body(s.name, new Date(slot.at)),
        at: at.toISOString(),
      });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/** Which ids to cancel and which notifications to schedule to move from `previous` to `next`. */
export function diffReminders(
  previous: Map<string, ScheduledNotification>,
  next: ScheduledNotification[],
): { cancel: string[]; schedule: ScheduledNotification[] } {
  const nextById = new Map(next.map((n) => [n.id, n]));
  const cancel = [...previous.keys()].filter((id) => !nextById.has(id));
  const schedule = next.filter((n) => {
    const old = previous.get(n.id);
    return !old || old.at !== n.at || old.title !== n.title || old.body !== n.body;
  });
  return { cancel, schedule };
}
