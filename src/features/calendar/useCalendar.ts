import { useEffect, useMemo, useState } from "react";
import {
  buildCalendarItems,
  type CalendarItem,
  type CalendarPostInput,
  type CalendarSlotInput,
  type MonthRef,
  monthGrid,
} from "../../core/calendar";
import { upcomingSlots } from "../../core/series";
import { createSeriesRepository } from "../../db/repositories/series";
import { platform } from "../../platform";

interface PostRow {
  id: string;
  idea_id: string;
  title: string;
  status: CalendarPostInput["status"];
  scheduled_at: string | null;
  published_at: string | null;
}

const DAY_MS = 86_400_000;

export function useCalendar(month: MonthRef) {
  const [posts, setPosts] = useState<CalendarPostInput[]>([]);
  const [slots, setSlots] = useState<CalendarSlotInput[]>([]);
  const [loaded, setLoaded] = useState(false);
  const grid = useMemo(() => monthGrid(month), [month]);
  const first = grid[0]?.date ?? "";
  const last = grid[grid.length - 1]?.date ?? "";

  useEffect(() => {
    let cancelled = false;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // A day of slack either side covers time-zone offsets; items are placed by local day later.
    const from = new Date(Date.parse(`${first}T00:00:00Z`) - DAY_MS);
    const to = new Date(Date.parse(`${last}T00:00:00Z`) + 2 * DAY_MS);
    (async () => {
      const rows = await platform.database.select<PostRow>(
        `SELECT p.id, p.idea_id, i.title, p.status, p.scheduled_at, p.published_at
           FROM posts p JOIN ideas i ON i.id = p.idea_id
          WHERE p.deleted_at IS NULL AND i.deleted_at IS NULL AND p.status != 'draft'
            AND COALESCE(p.published_at, p.scheduled_at) >= ?
            AND COALESCE(p.published_at, p.scheduled_at) < ?`,
        [from.toISOString(), to.toISOString()],
      );
      const repo = createSeriesRepository(platform.database);
      const all = await repo.list();
      const nextSlots: CalendarSlotInput[] = [];
      for (const s of all) {
        if (s.deletedAt) continue;
        const slotPosts = await repo.listSlotPosts(s.id);
        for (const slot of upcomingSlots(s, slotPosts, from, to, zone))
          nextSlots.push({ seriesId: s.id, seriesName: s.name, at: slot.at, filled: slot.filled });
      }
      if (cancelled) return;
      setPosts(
        rows.map((r) => ({
          id: r.id,
          ideaId: r.idea_id,
          title: r.title,
          status: r.status,
          scheduledAt: r.scheduled_at,
          publishedAt: r.published_at,
        })),
      );
      setSlots(nextSlots);
      setLoaded(true);
    })().catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [first, last]);

  const items: CalendarItem[] = useMemo(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return buildCalendarItems(posts, slots, new Date(), zone);
  }, [posts, slots]);

  return { grid, items, loaded };
}
