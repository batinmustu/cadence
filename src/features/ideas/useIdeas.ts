import { useCallback, useEffect, useMemo, useState } from "react";
import type { Idea } from "../../core/ideas";
import type { Tag } from "../../core/tags";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createTagsRepository } from "../../db/repositories/tags";
import { platform } from "../../platform";

export interface PlatformOption {
  id: string;
  name: string;
}

export interface IdeasData {
  ideas: Idea[];
  platforms: PlatformOption[];
  tags: Tag[];
  /** Earliest scheduled date per idea id, ISO string. */
  plannedAt: Record<string, string>;
  ready: boolean;
  capture(title: string, platformIds: string[], tagNames: string[]): Promise<void>;
}

export function useIdeas(): IdeasData {
  const repo = useMemo(() => createIdeasRepository(platform.database), []);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const tagsRepo = useMemo(() => createTagsRepository(platform.database), []);
  const [tags, setTags] = useState<Tag[]>([]);
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [plannedAt, setPlannedAt] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [list, plats, dates, allTags] = await Promise.all([
      repo.list(),
      platform.database.select<PlatformOption>(
        "SELECT id, name FROM platforms ORDER BY sort_order, name",
      ),
      platform.database.select<{ idea_id: string; at: string }>(
        "SELECT idea_id, MIN(scheduled_at) AS at FROM posts WHERE deleted_at IS NULL AND scheduled_at IS NOT NULL GROUP BY idea_id",
      ),
      tagsRepo.list(),
    ]);
    setIdeas(list);
    setTags(allTags);
    setPlatforms(plats);
    setPlannedAt(Object.fromEntries(dates.map((d) => [d.idea_id, d.at])));
    setReady(true);
  }, [repo, tagsRepo]);

  useEffect(() => {
    reload().catch(() => setReady(true));
  }, [reload]);

  const capture = useCallback(
    async (title: string, platformIds: string[], tagNames: string[]) => {
      const created = await Promise.all(tagNames.map((n) => tagsRepo.findOrCreate(n)));
      const tagIds = created.flatMap((t) => (t ? [t.id] : []));
      await repo.create({ title, platformIds, tagIds });
      await reload();
    },
    [repo, tagsRepo, reload],
  );

  return { ideas, platforms, tags, plannedAt, ready, capture };
}
