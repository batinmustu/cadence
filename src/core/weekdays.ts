export type Frequency = "weekly" | "biweekly" | "monthly";

/** Index 0 is Sunday, matching Date#getDay. Locale-neutral on purpose: callers translate. */
export const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export type SeriesRhythmLabel =
  | { kind: "weekdays"; days: WeekdayKey[] }
  | { kind: "biweekly" }
  | { kind: "monthly" };

/** What the sidebar shows next to a series: "Sun", "Mon Wed", "2w" or "1m". */
export function rhythmLabel(weekdays: number[], frequency: Frequency): SeriesRhythmLabel {
  if (frequency === "biweekly") return { kind: "biweekly" };
  if (frequency === "monthly") return { kind: "monthly" };
  const days = [...new Set(weekdays)]
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b)
    .flatMap((d) => {
      const key = WEEKDAY_KEYS[d];
      return key ? [key] : [];
    });
  return { kind: "weekdays", days };
}
