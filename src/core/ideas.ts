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
