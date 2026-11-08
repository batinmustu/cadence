import {
  createIdea,
  type Idea,
  type IdeaPatch,
  type IdeaStatus,
  updateIdea,
} from "../../core/ideas";
import { uuidv7 } from "../../core/ids";
import type { Database, SqlValue } from "../../platform/types";

interface IdeaRow {
  id: string;
  title: string;
  note: string;
  status: IdeaStatus;
  series_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IdeaFilter {
  statuses?: IdeaStatus[];
  platformId?: string;
  tagId?: string;
  seriesId?: string;
  includeDeleted?: boolean;
}

export interface IdeasRepository {
  create(input: Parameters<typeof createIdea>[0]): Promise<Idea>;
  update(id: string, patch: IdeaPatch): Promise<Idea | null>;
  softDelete(id: string): Promise<void>;
  get(id: string): Promise<Idea | null>;
  list(filter?: IdeaFilter): Promise<Idea[]>;
}

export function createIdeasRepository(
  db: Database,
  clock: () => Date = () => new Date(),
): IdeasRepository {
  async function hydrate(rows: IdeaRow[]): Promise<Idea[]> {
    if (rows.length === 0) return [];
    const marks = rows.map(() => "?").join(",");
    const ids: SqlValue[] = rows.map((r) => r.id);
    const [platforms, tags] = await Promise.all([
      db.select<{ idea_id: string; platform_id: string }>(
        `SELECT idea_id, platform_id FROM idea_platforms WHERE idea_id IN (${marks}) ORDER BY rowid`,
        ids,
      ),
      db.select<{ idea_id: string; tag_id: string }>(
        `SELECT idea_id, tag_id FROM idea_tags WHERE idea_id IN (${marks}) ORDER BY rowid`,
        ids,
      ),
    ]);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      note: r.note,
      status: r.status,
      seriesId: r.series_id,
      platformIds: platforms.filter((p) => p.idea_id === r.id).map((p) => p.platform_id),
      tagIds: tags.filter((t) => t.idea_id === r.id).map((t) => t.tag_id),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at,
    }));
  }

  async function replaceLinks(
    tx: Database,
    table: "idea_platforms" | "idea_tags",
    column: "platform_id" | "tag_id",
    ideaId: string,
    targets: string[],
    ts: string,
  ): Promise<void> {
    await tx.execute(`DELETE FROM ${table} WHERE idea_id = ?`, [ideaId]);
    for (const target of targets) {
      await tx.execute(
        `INSERT INTO ${table} (id, idea_id, ${column}, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [uuidv7(), ideaId, target, ts, ts],
      );
    }
  }

  const repo: IdeasRepository = {
    async create(input) {
      const idea = createIdea(input, clock());
      await db.transaction(async (tx) => {
        await tx.execute(
          "INSERT INTO ideas (id, title, note, status, series_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            idea.id,
            idea.title,
            idea.note,
            idea.status,
            idea.seriesId,
            idea.createdAt,
            idea.updatedAt,
          ],
        );
        await replaceLinks(
          tx,
          "idea_platforms",
          "platform_id",
          idea.id,
          idea.platformIds,
          idea.createdAt,
        );
        await replaceLinks(tx, "idea_tags", "tag_id", idea.id, idea.tagIds, idea.createdAt);
      });
      return idea;
    },

    async update(id, patch) {
      const current = await repo.get(id);
      if (!current || current.deletedAt) return null;
      const next = updateIdea(current, patch, clock());
      await db.transaction(async (tx) => {
        await tx.execute(
          "UPDATE ideas SET title = ?, note = ?, status = ?, series_id = ?, updated_at = ? WHERE id = ?",
          [next.title, next.note, next.status, next.seriesId, next.updatedAt, id],
        );
        if (patch.platformIds)
          await replaceLinks(
            tx,
            "idea_platforms",
            "platform_id",
            id,
            next.platformIds,
            next.updatedAt,
          );
        if (patch.tagIds)
          await replaceLinks(tx, "idea_tags", "tag_id", id, next.tagIds, next.updatedAt);
      });
      return next;
    },

    async softDelete(id) {
      const ts = clock().toISOString();
      await db.execute(
        "UPDATE ideas SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        [ts, ts, id],
      );
    },

    async get(id) {
      const rows = await db.select<IdeaRow>("SELECT * FROM ideas WHERE id = ?", [id]);
      return (await hydrate(rows))[0] ?? null;
    },

    async list(filter = {}) {
      const where: string[] = [];
      const params: SqlValue[] = [];
      if (!filter.includeDeleted) where.push("i.deleted_at IS NULL");
      if (filter.statuses?.length) {
        where.push(`i.status IN (${filter.statuses.map(() => "?").join(",")})`);
        params.push(...filter.statuses);
      }
      if (filter.seriesId) {
        where.push("i.series_id = ?");
        params.push(filter.seriesId);
      }
      if (filter.platformId) {
        where.push(
          "EXISTS (SELECT 1 FROM idea_platforms ip WHERE ip.idea_id = i.id AND ip.platform_id = ?)",
        );
        params.push(filter.platformId);
      }
      if (filter.tagId) {
        where.push("EXISTS (SELECT 1 FROM idea_tags it WHERE it.idea_id = i.id AND it.tag_id = ?)");
        params.push(filter.tagId);
      }
      const sql = `SELECT i.* FROM ideas i ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY i.created_at DESC, i.id DESC`;
      return hydrate(await db.select<IdeaRow>(sql, params));
    },
  };
  return repo;
}
