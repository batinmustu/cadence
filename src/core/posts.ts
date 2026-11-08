import { uuidv7 } from "./ids";

/** Free-form data on the wire, but only these three carry meaning in the app. */
export type PostStatus = "draft" | "scheduled" | "published";

export interface Post {
  id: string;
  ideaId: string;
  contentTypeId: string;
  fields: Record<string, unknown>;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  publishedUrl: string | null;
  afterNote: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NewPostInput {
  ideaId: string;
  contentTypeId: string;
  fields?: Record<string, unknown>;
}

export type PostPatch = Partial<
  Pick<Post, "fields" | "status" | "scheduledAt" | "publishedAt" | "publishedUrl" | "afterNote">
>;

export function createPost(input: NewPostInput, now: Date = new Date()): Post {
  const ts = now.toISOString();
  return {
    id: uuidv7(now.getTime()),
    ideaId: input.ideaId,
    contentTypeId: input.contentTypeId,
    fields: input.fields ?? {},
    status: "draft",
    scheduledAt: null,
    publishedAt: null,
    publishedUrl: null,
    afterNote: null,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
}

/** Keeps status and dates consistent: scheduling needs a date, unscheduling clears it. */
export function updatePost(post: Post, patch: PostPatch, now: Date = new Date()): Post {
  const next: Post = { ...post, ...patch, updatedAt: now.toISOString() };
  if (next.status === "draft") next.scheduledAt = patch.scheduledAt ?? null;
  if (next.status === "scheduled" && !next.scheduledAt)
    throw new Error("A scheduled post needs a scheduledAt date");
  if (next.status === "published" && !next.publishedAt) next.publishedAt = now.toISOString();
  return next;
}

export function parseFields(raw: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
