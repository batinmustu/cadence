import { localDate } from "./series";

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

export interface CalendarDay {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Day of month, 1–31. */
  day: number;
  inMonth: boolean;
}

/** Month shown by the calendar. `month` is 0–11. */
export interface MonthRef {
  year: number;
  month: number;
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const total = ref.year * 12 + ref.month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

const fmt = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** Six Monday-first weeks (42 days) that cover the month. */
export function monthGrid(ref: MonthRef): CalendarDay[] {
  const first = Date.UTC(ref.year, ref.month, 1);
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const out: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const ms = first + (i - lead) * DAY_MS;
    const d = new Date(ms);
    out.push({ date: fmt(ms), day: d.getUTCDate(), inMonth: d.getUTCMonth() === ref.month });
  }
  return out;
}

export type CalendarItemKind = "planned" | "empty" | "published";

export interface CalendarItem {
  key: string;
  kind: CalendarItemKind;
  /** Local day, `YYYY-MM-DD`. */
  date: string;
  /** UTC instant, used for ordering within a day. */
  at: string;
  label: string;
  ideaId: string | null;
  seriesId: string | null;
}

export interface CalendarPostInput {
  id: string;
  ideaId: string;
  title: string;
  status: "draft" | "scheduled" | "published";
  scheduledAt: string | null;
  publishedAt: string | null;
}

export interface CalendarSlotInput {
  seriesId: string;
  seriesName: string;
  at: string;
  filled: boolean;
}

/**
 * Items for the grid: scheduled and published posts, plus series slots that are
 * still empty and not in the past. Drafts never appear.
 */
export function buildCalendarItems(
  posts: CalendarPostInput[],
  slots: CalendarSlotInput[],
  now: Date,
  timeZone: string,
): CalendarItem[] {
  const items: CalendarItem[] = [];
  for (const p of posts) {
    if (p.status === "draft") continue;
    const at = p.status === "published" ? (p.publishedAt ?? p.scheduledAt) : p.scheduledAt;
    if (!at) continue;
    items.push({
      key: `post-${p.id}`,
      kind: p.status === "published" ? "published" : "planned",
      date: localDate(at, timeZone),
      at,
      label: p.title,
      ideaId: p.ideaId,
      seriesId: null,
    });
  }
  for (const s of slots) {
    if (s.filled || new Date(s.at).getTime() < now.getTime()) continue;
    items.push({
      key: `slot-${s.seriesId}-${s.at}`,
      kind: "empty",
      date: localDate(s.at, timeZone),
      at: s.at,
      label: s.seriesName,
      ideaId: null,
      seriesId: s.seriesId,
    });
  }
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

export function groupByDate(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const i of items) map.set(i.date, [...(map.get(i.date) ?? []), i]);
  return map;
}

/** Empty series slots that are still ahead and fall on a day shown in the grid. */
export function fillableSlots(items: CalendarItem[], first: string, last: string, now: Date) {
  return items
    .filter((i) => i.kind === "empty" && i.seriesId && i.date >= first && i.date <= last)
    .filter((i) => Date.parse(i.at) > now.getTime())
    .sort((a, b) => a.at.localeCompare(b.at));
}
