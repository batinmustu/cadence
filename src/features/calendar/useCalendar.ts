import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildCalendarItems,
  type CalendarItem,
  type CalendarPostInput,
  type CalendarSlotInput,
  fillableSlots,
  type MonthRef,
  monthGrid,
  moveToDate,
} from "../../core/calendar";
import type { Idea } from "../../core/ideas";
import { upcomingSlots } from "../../core/series";
import { draftPostFor } from "../../core/seriesView";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createPostsRepository } from "../../db/repositories/posts";
import { createSeriesRepository } from "../../db/repositories/series";
import { platform } from "../../platform";
import { createAiDraft } from "../series/aiDraft";
import { notifySeriesChanged } from "../series/seriesEvents";
import { useWeekStart } from "../settings/generalConfig";

interface PostRow {
  id: string;
  idea_id: string;
  title: string;
  status: CalendarPostInput["status"];
  scheduled_at: string | null;
  published_at: string | null;
  platform_name: string | null;
}

const DAY_MS = 86_400_000;

export function useCalendar(month: MonthRef) {
  const [posts, setPosts] = useState<CalendarPostInput[]>([]);
  const [slots, setSlots] = useState<CalendarSlotInput[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loaded, setLoaded] = useState(false);
  const weekStart = useWeekStart();
  const grid = useMemo(() => monthGrid(month, weekStart), [month, weekStart]);
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
          `SELECT p.id, p.idea_id, i.title, p.status, p.scheduled_at, p.published_at, pl.name AS platform_name
           FROM posts p JOIN ideas i ON i.id = p.idea_id
           LEFT JOIN content_types c ON c.id = p.content_type_id
           LEFT JOIN platforms pl ON pl.id = c.platform_id
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
            platformName: r.platform_name,
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
      notifySeriesChanged();
      await load(() => false);
    },
    [ideas, load],
  );

  /** Moves a scheduled post to another day, keeping its time of day. */
  const movePost = useCallback(
    async (postId: string, date: string) => {
      const posts = createPostsRepository(platform.database);
      const post = await posts.get(postId);
      if (post?.status !== "scheduled" || !post.scheduledAt) return;
      const at = moveToDate(post.scheduledAt, date);
      if (!at) return;
      await posts.update(postId, { scheduledAt: at });
      notifySeriesChanged();
      await load(() => false);
    },
    [load],
  );

  /** Back to draft: the idea stays, the date goes. */
  const unschedulePost = useCallback(
    async (postId: string) => {
      await createPostsRepository(platform.database).update(postId, { status: "draft" });
      notifySeriesChanged();
      await load(() => false);
    },
    [load],
  );

  /** Creates a new idea and schedules it in one step. */
  const createAndSchedule = useCallback(
    async (title: string, scheduledAt: string) => {
      const idea = await createIdeasRepository(platform.database).create({ title });
      const posts = createPostsRepository(platform.database);
      const ct = await platform.database.select<{ id: string }>(
        "SELECT c.id FROM content_types c JOIN platforms p ON p.id = c.platform_id ORDER BY p.sort_order, c.sort_order LIMIT 1",
      );
      const contentTypeId = ct[0]?.id;
      if (!contentTypeId) return;
      const post = await posts.create({ ideaId: idea.id, contentTypeId });
      await posts.update(post.id, { status: "scheduled", scheduledAt });
      notifySeriesChanged();
      await load(() => false);
    },
    [load],
  );

  const emptySlots = useMemo(
    () => fillableSlots(items, first, last, new Date()),
    [items, first, last],
  );

  /**
   * Creates one AI draft per chosen slot, one after another. Stops at the first
   * failure and reports what was created so far.
   */
  const fillSlots = useCallback(
    async (chosen: { seriesId: string; at: string }[]) => {
      const seriesRepo = createSeriesRepository(platform.database);
      let created = 0;
      let error: string | null = null;
      for (const slot of chosen) {
        try {
          const series = await seriesRepo.get(slot.seriesId);
          if (!series) throw "unknown";
          await createAiDraft(series, slot.at);
          created += 1;
        } catch (e) {
          error = typeof e === "string" ? e : "unknown";
          break;
        }
      }
      if (created > 0) {
        notifySeriesChanged();
        await load(() => false);
      }
      return { created, error };
    },
    [load],
  );

  return {
    grid,
    weekStart,
    items,
    loaded,
    ideas,
    scheduleIdea,
    movePost,
    unschedulePost,
    createAndSchedule,
    emptySlots,
    fillSlots,
  };
}
