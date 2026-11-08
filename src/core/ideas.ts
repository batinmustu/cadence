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

/** Newest first within each group; empty groups are omitted. */
export function groupIdeasByDate(ideas: Idea[], now: Date = new Date()): IdeaGroup[] {
  const order: IdeaDateGroup[] = ["today", "thisWeek", "earlier"];
  const buckets = new Map<IdeaDateGroup, Idea[]>(order.map((g) => [g, []]));
  for (const idea of ideas) buckets.get(dateGroupOf(idea.createdAt, now))?.push(idea);
  return order
    .map((group) => ({
      group,
      ideas: (buckets.get(group) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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
export type IdeaGroupBy = "date" | "series" | "status";

export interface IdeaQuery {
  status: IdeaFilterKey;
  platformId: string;
  seriesId: string;
  tagId: string;
  text: string;
  sort: IdeaSort;
  groupBy: IdeaGroupBy;
}

export const DEFAULT_IDEA_QUERY: IdeaQuery = {
  status: "all",
  platformId: "",
  seriesId: "",
  tagId: "",
  text: "",
  sort: "newest",
  groupBy: "date",
};

/** True when any filter (not sort/grouping) narrows the list. */
export function hasActiveFilters(q: IdeaQuery): boolean {
  return q.status !== "all" || !!q.platformId || !!q.seriesId || !!q.tagId || q.text.trim() !== "";
}

function matchesText(idea: Idea, text: string): boolean {
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  return idea.title.toLowerCase().includes(needle) || idea.note.toLowerCase().includes(needle);
}

/** Everything except the status filter, so status counts reflect the other filters. */
function matchesOthers(idea: Idea, q: IdeaQuery): boolean {
  if (q.platformId && !idea.platformIds.includes(q.platformId)) return false;
  if (q.seriesId && idea.seriesId !== q.seriesId) return false;
  if (q.tagId && !idea.tagIds.includes(q.tagId)) return false;
  return matchesText(idea, q.text);
}

function matchesStatus(idea: Idea, filter: IdeaFilterKey): boolean {
  // Archived ideas stay out of the default view.
  if (filter === "all") return idea.status !== "archived";
  return statusesForFilter(filter).includes(idea.status);
}

/** Counts per status filter given the other active filters. */
export function countByFilter(ideas: Idea[], q: IdeaQuery): Record<IdeaFilterKey, number> {
  const counts: Record<IdeaFilterKey, number> = { all: 0, draft: 0, planned: 0, published: 0 };
  for (const idea of ideas) {
    if (!matchesOthers(idea, q)) continue;
    for (const key of Object.keys(counts) as IdeaFilterKey[]) {
      if (matchesStatus(idea, key)) counts[key] += 1;
    }
  }
  return counts;
}

/**
 * Filters and sorts. "planned" sorts by the earliest scheduled date, soonest
 * first; ideas without a date go last (newest first among themselves).
 */
export function queryIdeas(
  ideas: Idea[],
  q: IdeaQuery,
  plannedAt: Record<string, string> = {},
): Idea[] {
  const out = ideas.filter((i) => matchesStatus(i, q.status) && matchesOthers(i, q));
  const byNewest = (a: Idea, b: Idea) => b.createdAt.localeCompare(a.createdAt);
  if (q.sort === "oldest") return out.sort((a, b) => -byNewest(a, b));
  if (q.sort === "planned") {
    return out.sort((a, b) => {
      const pa = plannedAt[a.id];
      const pb = plannedAt[b.id];
      if (pa && pb) return pa.localeCompare(pb) || byNewest(a, b);
      if (pa) return -1;
      if (pb) return 1;
      return byNewest(a, b);
    });
  }
  return out.sort(byNewest);
}

export interface IdeaSection {
  /** Stable key: date group, series id ("" = none) or status. */
  key: string;
  ideas: Idea[];
}

/** Splits an already-sorted list into sections, keeping the list order inside each. */
export function sectionIdeas(
  sorted: Idea[],
  by: IdeaGroupBy,
  now: Date = new Date(),
): IdeaSection[] {
  const keyOf = (i: Idea): string =>
    by === "date" ? dateGroupOf(i.createdAt, now) : by === "series" ? (i.seriesId ?? "") : i.status;
  const map = new Map<string, Idea[]>();
  for (const idea of sorted) {
    const k = keyOf(idea);
    const bucket = map.get(k);
    if (bucket) bucket.push(idea);
    else map.set(k, [idea]);
  }
  let keys = [...map.keys()];
  if (by === "date") {
    const order: string[] = ["today", "thisWeek", "earlier"];
    keys = keys.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  } else if (by === "status") {
    keys = keys.sort(
      (a, b) => IDEA_STATUSES.indexOf(a as IdeaStatus) - IDEA_STATUSES.indexOf(b as IdeaStatus),
    );
  } else {
    // Ideas without a series go last.
    keys = keys.sort((a, b) => (a === "" ? 1 : b === "" ? -1 : 0));
  }
  return keys.map((key) => ({ key, ideas: map.get(key) ?? [] }));
}
