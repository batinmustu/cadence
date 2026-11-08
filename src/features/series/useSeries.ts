import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyResult } from "../../core/assist";
import { parseFieldSchema } from "../../core/fieldSchema";
import type { Idea } from "../../core/ideas";
import type { Post } from "../../core/posts";
import { buildPrompt } from "../../core/prompt";
import { variantText } from "../../core/schedule";
import type { Series, SeriesPatch, Slot } from "../../core/series";
import { upcomingSlots } from "../../core/series";
import { buildDraftCommand, parseDraft } from "../../core/seriesDraft";
import { draftPostFor, groupSeriesIdeas, type SeriesIdeaGroups } from "../../core/seriesView";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createPostsRepository } from "../../db/repositories/posts";
import { createSeriesRepository } from "../../db/repositories/series";
import { createTagsRepository } from "../../db/repositories/tags";
import i18n from "../../i18n";
import { platform } from "../../platform";
import { errorKind } from "../assistant/useAssistant";
import { loadAiConfig } from "../settings/aiConfig";
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

  /**
   * Asks the AI for the next post, creates an idea + post scheduled into the slot
   * and tags the idea so the draft is clearly marked. Returns the idea id, or
   * throws an error kind string (see `assistant.error.*`).
   */
  const aiDraft = useCallback(
    async (slot: Slot): Promise<string> => {
      if (!series) throw "unknown";
      const config = await loadAiConfig();
      if (!config.hasKey && !config.verified) throw "notConnected";
      const [ct] = await platform.database.select<{
        id: string;
        name: string;
        field_schema: string;
      }>(
        "SELECT id, name, field_schema FROM content_types WHERE platform_id = ? ORDER BY sort_order LIMIT 1",
        [series.platformId],
      );
      if (!ct) throw "unknown";
      const parsed = parseFieldSchema(ct.field_schema);
      const schema = parsed.ok ? parsed.value : { fields: [] };
      const recent = [...posts]
        .filter((p) => p.status !== "draft")
        .sort((a, b) => (b.scheduledAt ?? b.createdAt).localeCompare(a.scheduledAt ?? a.createdAt))
        .map((p) => variantText(schema, p.fields));
      const built = buildPrompt({
        tone: config.tone,
        contentTypeName: ct.name,
        schema,
        commandPrompt: buildDraftCommand({
          seriesName: series.name,
          seriesDescription: series.description,
          template: series.template,
          recent,
        }),
      });
      let text = "";
      try {
        for await (const chunk of platform.ai.complete({
          provider: config.provider,
          model: config.model,
          system: built.system,
          prompt: built.prompt,
          ...(config.provider === "ollama" ? { baseUrl: config.ollamaUrl } : {}),
        })) {
          text += chunk;
        }
      } catch (e) {
        throw errorKind(e);
      }
      const draft = parseDraft(text);
      if (!draft) throw "empty";
      const idea = await repos.ideas.create({
        title: draft.title,
        seriesId: series.id,
        platformIds: [series.platformId],
      });
      const patch = applyResult(schema, {}, "replace", draft.body);
      const post = await repos.posts.create({
        ideaId: idea.id,
        contentTypeId: ct.id,
        ...(patch ? { fields: { [patch.key]: patch.value } } : {}),
      });
      await repos.posts.update(post.id, { status: "scheduled", scheduledAt: slot.at });
      const tag = await createTagsRepository(platform.database).findOrCreate(
        i18n.t("series.screen.aiDraftTag"),
      );
      if (tag) await repos.ideas.update(idea.id, { tagIds: [tag.id] });
      await reload();
      return idea.id;
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
    aiDraft,
  };
}
