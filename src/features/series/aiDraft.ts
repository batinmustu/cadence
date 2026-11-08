import { applyResult } from "../../core/assist";
import { parseFieldSchema } from "../../core/fieldSchema";
import { buildPrompt } from "../../core/prompt";
import { variantText } from "../../core/schedule";
import type { Series } from "../../core/series";
import { buildDraftCommand, parseDraft } from "../../core/seriesDraft";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createPostsRepository } from "../../db/repositories/posts";
import { createSeriesRepository } from "../../db/repositories/series";
import { createTagsRepository } from "../../db/repositories/tags";
import i18n from "../../i18n";
import { platform } from "../../platform";
import { errorKind } from "../assistant/useAssistant";
import { loadAiConfig } from "../settings/aiConfig";

/**
 * Asks the AI for the next post of a series, creates an idea + post scheduled at
 * `slotAt` and tags the idea so the draft is clearly marked. Returns the idea id.
 * Throws an error kind string (see `assistant.error.*`).
 */
export async function createAiDraft(series: Series, slotAt: string): Promise<string> {
  const config = await loadAiConfig();
  if (!config.hasKey && !config.verified) throw "notConnected";
  const [ct] = await platform.database.select<{ id: string; name: string; field_schema: string }>(
    "SELECT id, name, field_schema FROM content_types WHERE platform_id = ? ORDER BY sort_order LIMIT 1",
    [series.platformId],
  );
  if (!ct) throw "unknown";
  const parsed = parseFieldSchema(ct.field_schema);
  const schema = parsed.ok ? parsed.value : { fields: [] };
  const existing = await createSeriesRepository(platform.database).listPosts(series.id);
  const recent = existing
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
  const ideas = createIdeasRepository(platform.database);
  const posts = createPostsRepository(platform.database);
  const idea = await ideas.create({
    title: draft.title,
    seriesId: series.id,
    platformIds: [series.platformId],
  });
  const patch = applyResult(schema, {}, "replace", draft.body);
  const post = await posts.create({
    ideaId: idea.id,
    contentTypeId: ct.id,
    ...(patch ? { fields: { [patch.key]: patch.value } } : {}),
  });
  await posts.update(post.id, { status: "scheduled", scheduledAt: slotAt });
  const tag = await createTagsRepository(platform.database).findOrCreate(
    i18n.t("series.screen.aiDraftTag"),
  );
  if (tag) await ideas.update(idea.id, { tagIds: [tag.id] });
  return idea.id;
}
