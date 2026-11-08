import { useCallback, useEffect, useMemo, useState } from "react";
import type { Idea } from "../../core/ideas";
import type { Tag } from "../../core/tags";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createPlatformsRepository } from "../../db/repositories/platforms";
import { createTagsRepository } from "../../db/repositories/tags";
import { platform } from "../../platform";
import { onSeriesChanged } from "../series/seriesEvents";

export interface PlatformOption {
  id: string;
  name: string;
}

export interface SeriesOption {
  id: string;
  name: string;
}

export interface IdeasData {
  ideas: Idea[];
  platforms: PlatformOption[];
  tags: Tag[];
  series: SeriesOption[];
  /** Earliest scheduled date per idea id, ISO string. */
  plannedAt: Record<string, string>;
  ready: boolean;
  remove(id: string): Promise<void>;
  capture(
    title: string,
    platformIds: string[],
    tagNames: string[],
    seriesId?: string | null,
  ): Promise<void>;
}

export function useIdeas(): IdeasData {
  const repo = useMemo(() => createIdeasRepository(platform.database), []);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const tagsRepo = useMemo(() => createTagsRepository(platform.database), []);
  const [tags, setTags] = useState<Tag[]>([]);
  const [series, setSeries] = useState<SeriesOption[]>([]);
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [plannedAt, setPlannedAt] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [list, plats, dates, allTags, allSeries] = await Promise.all([
      repo.list(),
      createPlatformsRepository(platform.database).listVisible(),
      platform.database.select<{ idea_id: string; at: string }>(
        "SELECT idea_id, MIN(scheduled_at) AS at FROM posts WHERE deleted_at IS NULL AND scheduled_at IS NOT NULL GROUP BY idea_id",
      ),
      tagsRepo.list(),
      platform.database.select<SeriesOption>(
        "SELECT id, name FROM series WHERE deleted_at IS NULL ORDER BY created_at",
      ),
    ]);
    setSeries(allSeries);
    setIdeas(list);
    setTags(allTags);
    setPlatforms(plats);
    setPlannedAt(Object.fromEntries(dates.map((d) => [d.idea_id, d.at])));
    setReady(true);
  }, [repo, tagsRepo]);

  useEffect(() => onSeriesChanged(() => void reload().catch(() => undefined)), [reload]);

  useEffect(() => {
    reload().catch(() => setReady(true));
  }, [reload]);

  const capture = useCallback(
    async (
      title: string,
      platformIds: string[],
      tagNames: string[],
      seriesId: string | null = null,
    ) => {
      const created = await Promise.all(tagNames.map((n) => tagsRepo.findOrCreate(n)));
      const tagIds = created.flatMap((t) => (t ? [t.id] : []));
      await repo.create({ title, platformIds, tagIds, seriesId });
      await reload();
    },
    [repo, tagsRepo, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await repo.softDelete(id);
      await reload();
    },
    [repo, reload],
  );

  return { ideas, platforms, tags, series, plannedAt, ready, capture, remove };
}
