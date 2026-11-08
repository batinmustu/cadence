import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deriveIdeaStatus, type Idea } from "../../core/ideas";
import type { Post } from "../../core/posts";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createPostsRepository } from "../../db/repositories/posts";
import { platform } from "../../platform";

export interface ContentTypeOption {
  id: string;
  platformId: string;
  platformName: string;
  name: string;
}

export type SaveState = "saved" | "saving";

const AUTOSAVE_MS = 600;

export function useEditor(ideaId: string) {
  const ideas = useMemo(() => createIdeasRepository(platform.database), []);
  const posts = useMemo(() => createPostsRepository(platform.database), []);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [variants, setVariants] = useState<Post[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentTypeOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTitle = useRef<string | null>(null);

  const reload = useCallback(async () => {
    const [i, p, ct] = await Promise.all([
      ideas.get(ideaId),
      posts.listByIdea(ideaId),
      platform.database.select<{
        id: string;
        platform_id: string;
        platform_name: string;
        name: string;
      }>(
        "SELECT c.id, c.platform_id, p.name AS platform_name, c.name FROM content_types c JOIN platforms p ON p.id = c.platform_id ORDER BY p.sort_order, c.sort_order",
      ),
    ]);
    setIdea(i && !i.deletedAt ? i : null);
    setVariants(p);
    setContentTypes(
      ct.map((c) => ({
        id: c.id,
        platformId: c.platform_id,
        platformName: c.platform_name,
        name: c.name,
      })),
    );
    setLoaded(true);
  }, [ideas, posts, ideaId]);

  useEffect(() => {
    reload().catch(() => setLoaded(true));
  }, [reload]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const title = pendingTitle.current;
    pendingTitle.current = null;
    if (title === null) return;
    await ideas.update(ideaId, { title });
    setSaveState("saved");
  }, [ideas, ideaId]);

  // Leaving the screen must not lose a title typed in the last 600 ms.
  useEffect(() => () => void flush(), [flush]);

  const setTitle = useCallback(
    (title: string) => {
      setIdea((prev) => (prev ? { ...prev, title } : prev));
      pendingTitle.current = title.trim() === "" ? null : title;
      if (pendingTitle.current === null) return;
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush],
  );

  const setArchived = useCallback(
    async (archived: boolean) => {
      // Un-archiving re-derives the status from the posts.
      await ideas.update(ideaId, {
        status: archived ? "archived" : deriveIdeaStatus("idea", variants),
      });
      await reload();
    },
    [ideas, ideaId, variants, reload],
  );

  const addVariant = useCallback(
    async (contentTypeId: string) => {
      const post = await posts.create({ ideaId, contentTypeId });
      await reload();
      return post;
    },
    [posts, ideaId, reload],
  );

  return { idea, variants, contentTypes, loaded, saveState, setTitle, setArchived, addVariant };
}
