import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildCalendarItems,
  type CalendarItem,
  type CalendarPostInput,
  type CalendarSlotInput,
  type MonthRef,
  monthGrid,
} from "../../core/calendar";
import type { Idea } from "../../core/ideas";
import { upcomingSlots } from "../../core/series";
import { draftPostFor } from "../../core/seriesView";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createPostsRepository } from "../../db/repositories/posts";
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
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loaded, setLoaded] = useState(false);
  const grid = useMemo(() => monthGrid(month), [month]);
  const first = grid[0]?.date ?? "";
  const last = grid[grid.length - 1]?.date ?? "";

  const load = useCallback(
    async (isCancelled: () => boolean) => {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // A day of slack either side covers time-zone offsets; items are placed by local day later.
      const from = new Date(Date.parse(`${first}T00:00:00Z`) - DAY_MS);
      const to = new Date(Date.parse(`${last}T00:00:00Z`) + 2 * DAY_MS);
      {
        const rows = await platform.database.select<PostRow>(
          `SELECT p.id, p.idea_id, i.title, p.status, p.scheduled_at, p.published_at
           FROM posts p JOIN ideas i ON i.id = p.idea_id
          WHERE p.deleted_at IS NULL AND i.deleted_at IS NULL AND p.status != 'draft'
            AND COALESCE(p.published_at, p.scheduled_at) >= ?
            AND COALESCE(p.published_at, p.scheduled_at) < ?`,
          [from.toISOString(), to.toISOString()],
        );
        const unscheduled = await createIdeasRepository(platform.database).list({
          statuses: ["idea", "draft"],
        });
        const repo = createSeriesRepository(platform.database);
        const all = await repo.list();
        const nextSlots: CalendarSlotInput[] = [];
        for (const s of all) {
          if (s.deletedAt) continue;
          const slotPosts = await repo.listSlotPosts(s.id);
          for (const slot of upcomingSlots(s, slotPosts, from, to, zone))
            nextSlots.push({
              seriesId: s.id,
              seriesName: s.name,
              at: slot.at,
              filled: slot.filled,
            });
        }
        if (isCancelled()) return;
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
        setIdeas(unscheduled);
        setLoaded(true);
      }
    },
    [first, last],
  );

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled).catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [load]);

  const items: CalendarItem[] = useMemo(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return buildCalendarItems(posts, slots, new Date(), zone);
  }, [posts, slots]);

  /** Schedules the idea's draft (or a new post on its first platform) at the given instant. */
  const scheduleIdea = useCallback(
    async (ideaId: string, scheduledAt: string) => {
      const posts = createPostsRepository(platform.database);
      const idea = ideas.find((i) => i.id === ideaId);
      let post = draftPostFor(ideaId, await posts.listByIdea(ideaId));
      if (!post) {
        const ct = await platform.database.select<{ id: string }>(
          `SELECT c.id FROM content_types c JOIN platforms p ON p.id = c.platform_id
          ORDER BY (c.platform_id = ?) DESC, p.sort_order, c.sort_order LIMIT 1`,
          [idea?.platformIds[0] ?? ""],
        );
        const contentTypeId = ct[0]?.id;
        if (!contentTypeId) return;
        post = await posts.create({ ideaId, contentTypeId });
      }
      await posts.update(post.id, { status: "scheduled", scheduledAt });
      await load(() => false);
    },
    [ideas, load],
  );

  return { grid, items, loaded, ideas, scheduleIdea };
}
