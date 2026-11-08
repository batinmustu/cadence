import { useEffect, useState } from "react";
import type { Frequency } from "../../core/weekdays";
import { rhythmLabel, type SeriesRhythmLabel } from "../../core/weekdays";
import { platform } from "../../platform";

export interface SidebarSeries {
  id: string;
  name: string;
  rhythm: SeriesRhythmLabel;
}

interface Row {
  id: string;
  name: string;
  weekdays: string;
  frequency: Frequency;
}

function parseDays(raw: string): number[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is number => typeof v === "number") : [];
  } catch {
    return [];
  }
}

/** Empty until series can be created (v0.3). */
export function useSeriesList(): SidebarSeries[] {
  const [series, setSeries] = useState<SidebarSeries[]>([]);
  useEffect(() => {
    let cancelled = false;
    platform.database
      .select<Row>(
        "SELECT id, name, weekdays, frequency FROM series WHERE deleted_at IS NULL ORDER BY created_at",
      )
      .then((rows) => {
        if (cancelled) return;
        setSeries(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            rhythm: rhythmLabel(parseDays(r.weekdays), r.frequency),
          })),
        );
      })
      .catch(() => {
        // The sidebar must never break the shell; an empty list is acceptable.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return series;
}
