import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Idea } from "../../core/ideas";
import type { Post } from "../../core/posts";
import type { Series, SeriesPatch, Slot } from "../../core/series";
import { upcomingSlots } from "../../core/series";
import { draftPostFor, groupSeriesIdeas, type SeriesIdeaGroups } from "../../core/seriesView";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createPostsRepository } from "../../db/repositories/posts";
import { createSeriesRepository } from "../../db/repositories/series";
import { platform } from "../../platform";
import { notifySeriesChanged } from "./seriesEvents";

const AUTOSAVE_MS = 600;
const SLOT_COUNT = 4;
const HORIZON_DAYS = 120;

export interface PlatformOption {
  id: string;
  name: string;
}

export function useSeries(seriesId: string) {
  const repos = useMemo(
    () => ({
      series: createSeriesRepository(platform.database),
      ideas: createIdeasRepository(platform.database),
      posts: createPostsRepository(platform.database),
    }),
    [],
  );
  const [series, setSeries] = useState<Series | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef<SeriesPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    const [s, i, p, pl] = await Promise.all([
      repos.series.get(seriesId),
      repos.series.listIdeas(seriesId),
      repos.series.listPosts(seriesId),
      platform.database.select<PlatformOption>(
        "SELECT id, name FROM platforms ORDER BY sort_order, name",
      ),
    ]);
    setSeries(s && !s.deletedAt ? s : null);
    setIdeas(i);
    setPosts(p);
    setPlatforms(pl);
    setLoaded(true);
  }, [repos, seriesId]);

  useEffect(() => {
    reload().catch(() => setLoaded(true));
  }, [reload]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await repos.series.update(seriesId, patch);
    notifySeriesChanged();
  }, [repos, seriesId]);

  // Pending edits are written when leaving the screen.
  useEffect(
    () => () => {
      void flush();
    },
    [flush],
  );

  const edit = useCallback(
    (patch: SeriesPatch) => {
      setSeries((cur) => (cur ? { ...cur, ...patch } : cur));
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush],
  );

  const slots: Slot[] = useMemo(() => {
    if (!series) return [];
    const from = new Date();
    const to = new Date(from.getTime() + HORIZON_DAYS * 86_400_000);
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const slotPosts = posts
      .filter((p) => p.status !== "draft")
      .map((p) => ({ id: p.id, scheduledAt: p.scheduledAt }));
    return upcomingSlots(series, slotPosts, from, to, zone).slice(0, SLOT_COUNT);
  }, [series, posts]);

  const groups: SeriesIdeaGroups = useMemo(() => groupSeriesIdeas(ideas, posts), [ideas, posts]);

  const addIdea = useCallback(
    async (title: string) => {
      if (!series || title.trim() === "") return;
      await repos.ideas.create({ title, seriesId: series.id, platformIds: [series.platformId] });
      await reload();
    },
    [repos, series, reload],
  );

  /** Schedules the idea's draft (or a new post of the series' platform) into a slot. */
  const assignIdea = useCallback(
    async (ideaId: string, slot: Slot) => {
      if (!series) return;
      let post = draftPostFor(ideaId, posts);
      if (!post) {
        const ct = await platform.database.select<{ id: string }>(
          "SELECT id FROM content_types WHERE platform_id = ? ORDER BY sort_order LIMIT 1",
          [series.platformId],
        );
        const contentTypeId = ct[0]?.id;
        if (!contentTypeId) return;
        post = await repos.posts.create({ ideaId, contentTypeId });
      }
      await repos.posts.update(post.id, { status: "scheduled", scheduledAt: slot.at });
      await reload();
    },
    [repos, series, posts, reload],
  );

  const platformName = platforms.find((p) => p.id === series?.platformId)?.name ?? "";

  return {
    series,
    loaded,
    platforms,
    platformName,
    slots,
    groups,
    posts,
    edit,
    addIdea,
    assignIdea,
  };
}
