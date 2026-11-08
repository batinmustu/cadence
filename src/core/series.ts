import type { Frequency } from "./weekdays";

/** The parts of a series the slot calculation needs. Weekdays: 0 = Sunday … 6 = Saturday (7 also means Sunday). */
export interface SeriesRhythm {
  weekdays: number[];
  /** `HH:MM`, wall-clock time in the user's time zone. */
  time: string;
  frequency: Frequency;
  /** `YYYY-MM-DD` (a full ISO string is accepted; only the date part is used). */
  anchorDate: string;
}

/** A post that belongs to the series (through its idea). */
export interface SeriesPost {
  id: string;
  scheduledAt: string | null;
}

export interface Slot {
  /** UTC instant of the slot. */
  at: string;
  /** Local calendar day in the given time zone, `YYYY-MM-DD`. */
  date: string;
  filled: boolean;
  postId: string | null;
}

const DAY_MS = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Wall-clock fields of an instant in a zone. */
function wallParts(ms: number, timeZone: string) {
  const out: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(new Date(ms)))
    if (p.type !== "literal") out[p.type] = Number(p.value);
  return out as {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}

/** Offset (zone minus UTC) in ms at an instant. */
function offsetAt(ms: number, timeZone: string): number {
  const w = wallParts(ms, timeZone);
  return (
    Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(ms / 1000) * 1000
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day (`YYYY-MM-DD`) of an instant in a zone. */
export function localDate(iso: string, timeZone: string): string {
  const w = wallParts(new Date(iso).getTime(), timeZone);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/**
 * UTC instant for a wall-clock date and time in a zone. A time that does not exist
 * (spring-forward gap) lands just after the gap; an ambiguous one (fall back) takes the first.
 */
export function zonedToUtc(date: string, time: string, timeZone: string): number {
  const [y = 0, mo = 1, d = 1] = date.split("-").map(Number);
  const [h = 0, mi = 0] = time.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Offsets a day either side bracket any transition; keep candidates whose wall time matches.
  const candidates = [-DAY_MS, DAY_MS].map((delta) => wall - offsetAt(wall + delta, timeZone));
  const valid = candidates.filter((ms) => ms + offsetAt(ms, timeZone) === wall);
  // Ambiguous (fall back): earliest. Nonexistent (spring forward): the later one, just after the gap.
  return valid.length > 0 ? Math.min(...valid) : Math.max(...candidates);
}

function dayNumber(date: string): number {
  const [y = 0, mo = 1, d = 1] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, mo - 1, d) / DAY_MS);
}

function dateOf(dayNum: number): string {
  const d = new Date(dayNum * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 0 = Sunday. 1970-01-01 was a Thursday. */
const weekdayOf = (dayNum: number) => (((dayNum + 4) % 7) + 7) % 7;

/** Day number of the Monday that starts the week containing `dayNum`. */
const mondayOf = (dayNum: number) => dayNum - ((weekdayOf(dayNum) + 6) % 7);

function dayHasSlot(
  series: SeriesRhythm,
  days: Set<number>,
  first: number | undefined,
  day: number,
  anchor: number,
): boolean {
  if (day < anchor) return false;
  const wd = weekdayOf(day);
  if (series.frequency === "weekly") return days.has(wd);
  if (series.frequency === "biweekly") {
    const weeks = (mondayOf(day) - mondayOf(anchor)) / 7;
    return weeks % 2 === 0 && days.has(wd);
  }
  // Monthly: the first occurrence in the month of the first listed weekday.
  if (first === undefined || wd !== first) return false;
  return Math.floor((new Date(day * DAY_MS).getUTCDate() - 1) / 7) === 0;
}

/**
 * Slots of a series between `from` (inclusive) and `to` (exclusive), oldest first.
 * A slot is filled when one of `posts` is scheduled on the same local day.
 */
export function upcomingSlots(
  series: SeriesRhythm,
  posts: SeriesPost[],
  from: Date,
  to: Date,
  timeZone: string,
): Slot[] {
  const days = new Set(series.weekdays.map((d) => d % 7).filter((d) => d >= 0));
  const firstListed = series.weekdays[0] === undefined ? undefined : series.weekdays[0] % 7;
  const anchor = dayNumber(series.anchorDate.slice(0, 10));
  const startDay = dayNumber(localDate(from.toISOString(), timeZone));
  // One extra day on each side covers zone offsets; the instant check below trims the result.
  const endDay = dayNumber(localDate(to.toISOString(), timeZone)) + 1;

  const postsByDay = new Map<string, SeriesPost>();
  for (const p of posts) {
    if (!p.scheduledAt) continue;
    const key = localDate(p.scheduledAt, timeZone);
    if (!postsByDay.has(key)) postsByDay.set(key, p);
  }

  const slots: Slot[] = [];
  for (let day = startDay - 1; day <= endDay; day++) {
    if (!dayHasSlot(series, days, firstListed, day, anchor)) continue;
    const date = dateOf(day);
    const ms = zonedToUtc(date, series.time, timeZone);
    if (ms < from.getTime() || ms >= to.getTime()) continue;
    const post = postsByDay.get(date) ?? null;
    slots.push({
      at: new Date(ms).toISOString(),
      date,
      filled: post !== null,
      postId: post?.id ?? null,
    });
  }
  return slots;
}
