import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type FieldSchema, parseFieldSchema } from "../../core/fieldSchema";
import { deriveIdeaStatus, type Idea } from "../../core/ideas";
import type { Post, PostPatch } from "../../core/posts";
import type { Tag } from "../../core/tags";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createPostsRepository } from "../../db/repositories/posts";
import { createTagsRepository } from "../../db/repositories/tags";
import { platform } from "../../platform";

export interface ContentTypeOption {
  id: string;
  platformId: string;
  platformName: string;
  name: string;
  schema: FieldSchema;
}

export type SaveState = "saved" | "saving";

const AUTOSAVE_MS = 600;

/** A broken schema renders as an empty form rather than breaking the editor. */
function toSchema(json: string): FieldSchema {
  const parsed = parseFieldSchema(json);
  return parsed.ok ? parsed.value : { fields: [] };
}

export function useEditor(ideaId: string) {
  const ideas = useMemo(() => createIdeasRepository(platform.database), []);
  const posts = useMemo(() => createPostsRepository(platform.database), []);
  const tagsRepo = useMemo(() => createTagsRepository(platform.database), []);
  const [tags, setTags] = useState<Tag[]>([]);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [variants, setVariants] = useState<Post[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentTypeOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTitle = useRef<string | null>(null);
  const pendingFields = useRef<Map<string, Record<string, unknown>>>(new Map());
  const latestFields = useRef<Map<string, Record<string, unknown>>>(new Map());
  const fieldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    const [i, p, ct, allTags] = await Promise.all([
      ideas.get(ideaId),
      posts.listByIdea(ideaId),
      platform.database.select<{
        id: string;
        platform_id: string;
        platform_name: string;
        name: string;
        field_schema: string;
      }>(
        "SELECT c.id, c.platform_id, p.name AS platform_name, c.name, c.field_schema FROM content_types c JOIN platforms p ON p.id = c.platform_id ORDER BY p.sort_order, c.sort_order",
      ),
      tagsRepo.list(),
    ]);
    setTags(allTags);
    setIdea(i && !i.deletedAt ? i : null);
    setVariants(p);
    for (const v of p) latestFields.current.set(v.id, v.fields);
    setContentTypes(
      ct.map((c) => ({
        id: c.id,
        platformId: c.platform_id,
        platformName: c.platform_name,
        name: c.name,
        schema: toSchema(c.field_schema),
      })),
    );
    setLoaded(true);
  }, [ideas, posts, tagsRepo, ideaId]);

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

  const flushFields = useCallback(async () => {
    if (fieldTimer.current) clearTimeout(fieldTimer.current);
    fieldTimer.current = null;
    const pending = [...pendingFields.current];
    pendingFields.current.clear();
    for (const [id, fields] of pending) await posts.update(id, { fields });
    if (pending.length > 0) setSaveState("saved");
  }, [posts]);

  // Leaving the screen must not lose text typed in the last 600 ms.
  useEffect(
    () => () => {
      void flush();
      void flushFields();
    },
    [flush, flushFields],
  );

  const setField = useCallback(
    (postId: string, key: string, value: unknown) => {
      // The ref holds the latest fields so fast typing never builds on stale state.
      const current = latestFields.current.get(postId) ?? {};
      const next = { ...current, [key]: value };
      latestFields.current.set(postId, next);
      pendingFields.current.set(postId, next);
      setVariants((prev) => prev.map((v) => (v.id === postId ? { ...v, fields: next } : v)));
      setSaveState("saving");
      if (fieldTimer.current) clearTimeout(fieldTimer.current);
      fieldTimer.current = setTimeout(() => void flushFields(), AUTOSAVE_MS);
    },
    [flushFields],
  );

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

  /** Status changes (schedule, publish) write through the repository, then reload. */
  const updateVariant = useCallback(
    async (postId: string, patch: PostPatch) => {
      await flushFields();
      await posts.update(postId, patch);
      await reload();
    },
    [posts, flushFields, reload],
  );

  const addTag = useCallback(
    async (name: string) => {
      const tag = await tagsRepo.findOrCreate(name);
      if (!tag || !idea || idea.tagIds.includes(tag.id)) return;
      await ideas.update(ideaId, { tagIds: [...idea.tagIds, tag.id] });
      await reload();
    },
    [tagsRepo, ideas, ideaId, idea, reload],
  );

  const removeTag = useCallback(
    async (tagId: string) => {
      if (!idea) return;
      await ideas.update(ideaId, { tagIds: idea.tagIds.filter((id) => id !== tagId) });
      await reload();
    },
    [ideas, ideaId, idea, reload],
  );

  const addVariant = useCallback(
    async (contentTypeId: string) => {
      const post = await posts.create({ ideaId, contentTypeId });
      await reload();
      return post;
    },
    [posts, ideaId, reload],
  );

  return {
    idea,
    tags,
    addTag,
    removeTag,
    variants,
    contentTypes,
    loaded,
    saveState,
    setTitle,
    setField,
    updateVariant,
    setArchived,
    addVariant,
  };
}
