import { deriveIdeaStatus, type IdeaStatus } from "../../core/ideas";
import {
  createPost,
  type NewPostInput,
  type Post,
  type PostPatch,
  parseFields,
  updatePost,
} from "../../core/posts";
import type { Database } from "../../platform/types";

interface PostRow {
  id: string;
  idea_id: string;
  content_type_id: string;
  fields: string;
  status: Post["status"];
  scheduled_at: string | null;
  published_at: string | null;
  published_url: string | null;
  after_note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PostsRepository {
  create(input: NewPostInput): Promise<Post>;
  update(id: string, patch: PostPatch): Promise<Post | null>;
  softDelete(id: string): Promise<void>;
  get(id: string): Promise<Post | null>;
  listByIdea(ideaId: string): Promise<Post[]>;
  /** Scheduled posts with from <= scheduled_at < to (ISO strings), earliest first. */
  listScheduled(from: string, to: string): Promise<Post[]>;
}

const toPost = (r: PostRow): Post => ({
  id: r.id,
  ideaId: r.idea_id,
  contentTypeId: r.content_type_id,
  fields: parseFields(r.fields),
  status: r.status,
  scheduledAt: r.scheduled_at,
  publishedAt: r.published_at,
  publishedUrl: r.published_url,
  afterNote: r.after_note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

export function createPostsRepository(
  db: Database,
  clock: () => Date = () => new Date(),
): PostsRepository {
  /** An idea's status follows its live posts; archived stays manual. */
  async function syncIdeaStatus(tx: Database, ideaId: string): Promise<void> {
    const ideas = await tx.select<{ status: IdeaStatus }>("SELECT status FROM ideas WHERE id = ?", [
      ideaId,
    ]);
    const current = ideas[0]?.status;
    if (!current) return;
    const posts = await tx.select<{ status: string }>(
      "SELECT status FROM posts WHERE idea_id = ? AND deleted_at IS NULL",
      [ideaId],
    );
    const next = deriveIdeaStatus(current, posts);
    if (next !== current)
      await tx.execute("UPDATE ideas SET status = ?, updated_at = ? WHERE id = ?", [
        next,
        clock().toISOString(),
        ideaId,
      ]);
  }

  const repo: PostsRepository = {
    async create(input) {
      const post = createPost(input, clock());
      await db.transaction(async (tx) => {
        await tx.execute(
          "INSERT INTO posts (id, idea_id, content_type_id, fields, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            post.id,
            post.ideaId,
            post.contentTypeId,
            JSON.stringify(post.fields),
            post.status,
            post.createdAt,
            post.updatedAt,
          ],
        );
        await syncIdeaStatus(tx, post.ideaId);
      });
      return post;
    },

    async update(id, patch) {
      const current = await repo.get(id);
      if (!current || current.deletedAt) return null;
      const next = updatePost(current, patch, clock());
      await db.transaction(async (tx) => {
        await tx.execute(
          "UPDATE posts SET fields = ?, status = ?, scheduled_at = ?, published_at = ?, published_url = ?, after_note = ?, updated_at = ? WHERE id = ?",
          [
            JSON.stringify(next.fields),
            next.status,
            next.scheduledAt,
            next.publishedAt,
            next.publishedUrl,
            next.afterNote,
            next.updatedAt,
            id,
          ],
        );
        await syncIdeaStatus(tx, next.ideaId);
      });
      return next;
    },

    async softDelete(id) {
      const current = await repo.get(id);
      if (!current || current.deletedAt) return;
      const ts = clock().toISOString();
      await db.transaction(async (tx) => {
        await tx.execute("UPDATE posts SET deleted_at = ?, updated_at = ? WHERE id = ?", [
          ts,
          ts,
          id,
        ]);
        await syncIdeaStatus(tx, current.ideaId);
      });
    },

    async get(id) {
      const rows = await db.select<PostRow>("SELECT * FROM posts WHERE id = ?", [id]);
      return rows[0] ? toPost(rows[0]) : null;
    },

    async listByIdea(ideaId) {
      const rows = await db.select<PostRow>(
        "SELECT * FROM posts WHERE idea_id = ? AND deleted_at IS NULL ORDER BY created_at, id",
        [ideaId],
      );
      return rows.map(toPost);
    },

    async listScheduled(from, to) {
      const rows = await db.select<PostRow>(
        "SELECT * FROM posts WHERE status = 'scheduled' AND deleted_at IS NULL AND scheduled_at >= ? AND scheduled_at < ? ORDER BY scheduled_at, id",
        [from, to],
      );
      return rows.map(toPost);
    },
  };
  return repo;
}
