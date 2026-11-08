import type { PublishedItem } from "../../core/published";
import type { Database, SqlValue } from "../../platform/types";

export interface PublishedFilter {
  platformId?: string;
  seriesId?: string;
  limit?: number;
  offset?: number;
}

interface Row {
  post_id: string;
  idea_id: string;
  title: string;
  platform_id: string;
  platform_name: string;
  series_id: string | null;
  series_name: string | null;
  published_at: string;
  field_schema: string;
  fields: string;
}

const FROM = `FROM posts p
  JOIN ideas i ON i.id = p.idea_id
  JOIN content_types c ON c.id = p.content_type_id
  JOIN platforms pl ON pl.id = c.platform_id
  LEFT JOIN series s ON s.id = i.series_id AND s.deleted_at IS NULL
  WHERE p.status = 'published' AND p.published_at IS NOT NULL
    AND p.deleted_at IS NULL AND i.deleted_at IS NULL`;

function where(filter: PublishedFilter): { sql: string; params: SqlValue[] } {
  const params: SqlValue[] = [];
  let sql = "";
  if (filter.platformId) {
    sql += " AND pl.id = ?";
    params.push(filter.platformId);
  }
  if (filter.seriesId) {
    sql += " AND i.series_id = ?";
    params.push(filter.seriesId);
  }
  return { sql, params };
}

/** Published posts, newest first, one row per post (an idea can publish on several platforms). */
export async function listPublished(
  db: Database,
  filter: PublishedFilter = {},
): Promise<{ items: PublishedItem[]; total: number }> {
  const w = where(filter);
  const rows = await db.select<Row>(
    `SELECT p.id AS post_id, p.idea_id, i.title, pl.id AS platform_id, pl.name AS platform_name,
            i.series_id, s.name AS series_name, p.published_at, c.field_schema, p.fields
     ${FROM}${w.sql} ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...w.params, filter.limit ?? 100, filter.offset ?? 0],
  );
  const count = await db.select<{ n: number }>(`SELECT COUNT(*) AS n ${FROM}${w.sql}`, w.params);
  return {
    total: count[0]?.n ?? 0,
    items: rows.map((r) => ({
      postId: r.post_id,
      ideaId: r.idea_id,
      title: r.title,
      platformId: r.platform_id,
      platformName: r.platform_name,
      seriesId: r.series_id,
      seriesName: r.series_name,
      publishedAt: r.published_at,
      fieldSchema: r.field_schema,
      fields: r.fields,
    })),
  };
}
