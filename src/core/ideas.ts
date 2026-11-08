import { uuidv7 } from "./ids";

export type IdeaStatus = "idea" | "draft" | "planned" | "published" | "archived";

export const IDEA_STATUSES: readonly IdeaStatus[] = [
  "idea",
  "draft",
  "planned",
  "published",
  "archived",
];

export interface Idea {
  id: string;
  title: string;
  note: string;
  status: IdeaStatus;
  seriesId: string | null;
  platformIds: string[];
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NewIdeaInput {
  title: string;
  note?: string;
  seriesId?: string | null;
  platformIds?: string[];
  tagIds?: string[];
}

export type IdeaPatch = Partial<
  Pick<Idea, "title" | "note" | "status" | "seriesId" | "platformIds" | "tagIds">
>;

export function createIdea(input: NewIdeaInput, now: Date = new Date()): Idea {
  const ts = now.toISOString();
  return {
    id: uuidv7(now.getTime()),
    title: input.title.trim(),
    note: input.note ?? "",
    status: "idea",
    seriesId: input.seriesId ?? null,
    platformIds: [...new Set(input.platformIds ?? [])],
    tagIds: [...new Set(input.tagIds ?? [])],
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
}

export function updateIdea(idea: Idea, patch: IdeaPatch, now: Date = new Date()): Idea {
  return {
    ...idea,
    ...patch,
    title: patch.title === undefined ? idea.title : patch.title.trim(),
    platformIds: patch.platformIds ? [...new Set(patch.platformIds)] : idea.platformIds,
    tagIds: patch.tagIds ? [...new Set(patch.tagIds)] : idea.tagIds,
    updatedAt: now.toISOString(),
  };
}

/** Post statuses are free-form data; only these two carry meaning for an idea. */
export interface PostStatusInfo {
  status: string;
}

/**
 * Derives an idea's status from its posts. Archived is a manual decision and
 * is never overridden. Published means every post is out; planned means at
 * least one is scheduled.
 */
export function deriveIdeaStatus(current: IdeaStatus, posts: PostStatusInfo[]): IdeaStatus {
  if (current === "archived") return "archived";
  if (posts.length === 0) return "idea";
  if (posts.every((p) => p.status === "published")) return "published";
  if (posts.some((p) => p.status === "scheduled")) return "planned";
  return "draft";
}

export type IdeaDateGroup = "today" | "thisWeek" | "earlier";

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "This week" is the rolling last 7 days excluding today, so groups never overlap. */
export function dateGroupOf(createdAt: string, now: Date = new Date()): IdeaDateGroup {
  const today = startOfDay(now);
  const created = startOfDay(new Date(createdAt));
  if (created >= today) return "today";
  if (created >= today - 6 * 86_400_000) return "thisWeek";
  return "earlier";
}

export interface IdeaGroup {
  group: IdeaDateGroup;
  ideas: Idea[];
}

/**
 * Newest first within each group unless `keepOrder` is set (the caller already
 * sorted); empty groups are omitted.
 */
export function groupIdeasByDate(
  ideas: Idea[],
  now: Date = new Date(),
  keepOrder = false,
): IdeaGroup[] {
  const order: IdeaDateGroup[] = ["today", "thisWeek", "earlier"];
  const buckets = new Map<IdeaDateGroup, Idea[]>(order.map((g) => [g, []]));
  for (const idea of ideas) buckets.get(dateGroupOf(idea.createdAt, now))?.push(idea);
  return order
    .map((group) => ({
      group,
      ideas: keepOrder
        ? (buckets.get(group) ?? [])
        : (buckets.get(group) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
    .filter((g) => g.ideas.length > 0);
}

export function filterIdeasByStatus(ideas: Idea[], statuses: IdeaStatus[]): Idea[] {
  if (statuses.length === 0) return ideas;
  return ideas.filter((i) => statuses.includes(i.status));
}

export type IdeaFilterKey = "all" | "draft" | "planned" | "published";

/** The UI filter "draft" also covers bare ideas that have no post yet. */
export function statusesForFilter(filter: IdeaFilterKey): IdeaStatus[] {
  switch (filter) {
    case "draft":
      return ["idea", "draft"];
    case "planned":
      return ["planned"];
    case "published":
      return ["published"];
    default:
      return [];
  }
}

export type IdeaSort = "newest" | "oldest" | "planned";
export const IDEA_SORTS: readonly IdeaSort[] = ["newest", "oldest", "planned"];
export const IDEA_FILTER_KEYS: readonly IdeaFilterKey[] = ["all", "draft", "planned", "published"];

/** Empty string means "any". */
export interface IdeaQuery {
  status: IdeaFilterKey;
  platformId: string;
  seriesId: string;
  tagId: string;
  text: string;
  sort: IdeaSort;
}

export const DEFAULT_IDEA_QUERY: IdeaQuery = {
  status: "all",
  platformId: "",
  seriesId: "",
  tagId: "",
  text: "",
  sort: "newest",
};

export function hasActiveFilters(q: IdeaQuery): boolean {
  return (
    q.status !== "all" ||
    q.platformId !== "" ||
    q.seriesId !== "" ||
    q.tagId !== "" ||
    q.text !== ""
  );
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Reads URL search params defensively; anything unknown falls back to the default. */
export function parseIdeaSearch(raw: Record<string, unknown>): IdeaQuery {
  const status = IDEA_FILTER_KEYS.find((k) => k === raw.status) ?? "all";
  const sort = IDEA_SORTS.find((k) => k === raw.sort) ?? "newest";
  return {
    status,
    sort,
    platformId: str(raw.platform),
    seriesId: str(raw.series),
    tagId: str(raw.tag),
    text: str(raw.q),
  };
}

/** Only non-default values go into the URL. */
export function serializeIdeaSearch(q: IdeaQuery): Record<string, string> {
  const out: Record<string, string> = {};
  if (q.status !== "all") out.status = q.status;
  if (q.sort !== "newest") out.sort = q.sort;
  if (q.platformId) out.platform = q.platformId;
  if (q.seriesId) out.series = q.seriesId;
  if (q.tagId) out.tag = q.tagId;
  if (q.text) out.q = q.text;
  return out;
}

function matchesExceptStatus(i: Idea, q: IdeaQuery): boolean {
  if (q.platformId && !i.platformIds.includes(q.platformId)) return false;
  if (q.seriesId && i.seriesId !== q.seriesId) return false;
  if (q.tagId && !i.tagIds.includes(q.tagId)) return false;
  const needle = q.text.trim().toLowerCase();
  if (needle && !`${i.title}\n${i.note}`.toLowerCase().includes(needle)) return false;
  return true;
}

/** Archived ideas stay out of the default ("all") view. */
export function ideaMatchesStatus(i: Idea, status: IdeaFilterKey): boolean {
  if (status === "all") return i.status !== "archived";
  return statusesForFilter(status).includes(i.status);
}

/** Per-status counts with every other filter applied, so the numbers match the list. */
export function countIdeasByStatus(ideas: Idea[], q: IdeaQuery): Record<IdeaFilterKey, number> {
  const counts: Record<IdeaFilterKey, number> = { all: 0, draft: 0, planned: 0, published: 0 };
  for (const i of ideas) {
    if (!matchesExceptStatus(i, q)) continue;
    for (const k of IDEA_FILTER_KEYS) if (ideaMatchesStatus(i, k)) counts[k] += 1;
  }
  return counts;
}

/** `plannedAt` maps idea id to its earliest scheduled ISO date. */
export function queryIdeas(
  ideas: Idea[],
  q: IdeaQuery,
  plannedAt: Record<string, string> = {},
): Idea[] {
  const found = ideas.filter((i) => ideaMatchesStatus(i, q.status) && matchesExceptStatus(i, q));
  const newest = (a: Idea, b: Idea) => b.createdAt.localeCompare(a.createdAt);
  if (q.sort === "oldest") return found.sort((a, b) => -newest(a, b));
  if (q.sort === "planned") {
    return found.sort((a, b) => {
      const pa = plannedAt[a.id];
      const pb = plannedAt[b.id];
      if (pa && pb) return pa.localeCompare(pb) || newest(a, b);
      if (pa) return -1;
      if (pb) return 1;
      return newest(a, b);
    });
  }
  return found.sort(newest);
}

/** Keeps the first `limit` ideas across groups, preserving group order. */
export function limitGroups(groups: IdeaGroup[], limit: number): IdeaGroup[] {
  let left = limit;
  const out: IdeaGroup[] = [];
  for (const g of groups) {
    if (left <= 0) break;
    out.push({ group: g.group, ideas: g.ideas.slice(0, left) });
    left -= g.ideas.length;
  }
  return out;
}
