import { useCallback, useEffect, useMemo, useState } from "react";
import type { Idea } from "../../core/ideas";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { platform } from "../../platform";

export interface PlatformOption {
  id: string;
  name: string;
}

export interface IdeasData {
  ideas: Idea[];
  platforms: PlatformOption[];
  /** Earliest scheduled date per idea id, ISO string. */
  plannedAt: Record<string, string>;
  ready: boolean;
  capture(title: string, platformIds: string[]): Promise<void>;
}

export function useIdeas(): IdeasData {
  const repo = useMemo(() => createIdeasRepository(platform.database), []);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [plannedAt, setPlannedAt] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [list, plats, dates] = await Promise.all([
      repo.list(),
      platform.database.select<PlatformOption>(
        "SELECT id, name FROM platforms ORDER BY sort_order, name",
      ),
      platform.database.select<{ idea_id: string; at: string }>(
        "SELECT idea_id, MIN(scheduled_at) AS at FROM posts WHERE deleted_at IS NULL AND scheduled_at IS NOT NULL GROUP BY idea_id",
      ),
    ]);
    setIdeas(list);
    setPlatforms(plats);
    setPlannedAt(Object.fromEntries(dates.map((d) => [d.idea_id, d.at])));
    setReady(true);
  }, [repo]);

  useEffect(() => {
    reload().catch(() => setReady(true));
  }, [reload]);

  const capture = useCallback(
    async (title: string, platformIds: string[]) => {
      await repo.create({ title, platformIds });
      await reload();
    },
    [repo, reload],
  );

  return { ideas, platforms, plannedAt, ready, capture };
}
