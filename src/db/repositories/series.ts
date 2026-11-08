import type { Idea } from "../../core/ideas";
import type { Post } from "../../core/posts";
import {
  createSeries,
  type NewSeriesInput,
  type Series,
  type SeriesPatch,
  type SeriesPost,
  updateSeries,
} from "../../core/series";
import type { Frequency } from "../../core/weekdays";
import type { Database } from "../../platform/types";
import { createIdeasRepository } from "./ideas";
import { createPostsRepository } from "./posts";

interface SeriesRow {
  id: string;
  name: string;
  description: string;
  platform_id: string;
  weekdays: string;
  time: string;
  frequency: Frequency;
  anchor_date: string;
  template: string;
  remind_before_hours: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SeriesRepository {
  create(input: NewSeriesInput): Promise<Series>;
  update(id: string, patch: SeriesPatch): Promise<Series | null>;
  /** Soft-deletes the series and detaches its ideas. */
  softDelete(id: string): Promise<void>;
  get(id: string): Promise<Series | null>;
  list(): Promise<Series[]>;
  /** Pass null to remove an idea from its series. */
  assignIdea(ideaId: string, seriesId: string | null): Promise<void>;
  listIdeas(seriesId: string): Promise<Idea[]>;
  /** Live posts of the series' ideas, soonest scheduled first (unscheduled last). */
  listPosts(seriesId: string): Promise<Post[]>;
  /** The same posts reduced to what slot calculation needs. */
  listSlotPosts(seriesId: string): Promise<SeriesPost[]>;
}

function parseWeekdays(json: string): number[] {
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((d): d is number => typeof d === "number") : [];
  } catch {
    return [];
  }
}

const toSeries = (r: SeriesRow): Series => ({
  id: r.id,
  name: r.name,
  description: r.description,
  platformId: r.platform_id,
  weekdays: parseWeekdays(r.weekdays),
  time: r.time,
  frequency: r.frequency,
  anchorDate: r.anchor_date,
  template: r.template,
  remindBeforeHours: r.remind_before_hours,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

const COLUMNS =
  "id, name, description, platform_id, weekdays, time, frequency, anchor_date, template, remind_before_hours, created_at, updated_at, deleted_at";

export function createSeriesRepository(
  db: Database,
  clock: () => Date = () => new Date(),
): SeriesRepository {
  const ideas = createIdeasRepository(db, clock);
  const posts = createPostsRepository(db, clock);

  async function get(id: string): Promise<Series | null> {
    const rows = await db.select<SeriesRow>(`SELECT ${COLUMNS} FROM series WHERE id = ?`, [id]);
    return rows[0] ? toSeries(rows[0]) : null;
  }

  async function listIdeas(seriesId: string): Promise<Idea[]> {
    return ideas.list({ seriesId });
  }

  async function listPosts(seriesId: string): Promise<Post[]> {
    const rows = await db.select<{ id: string }>(
      `SELECT p.id FROM posts p JOIN ideas i ON i.id = p.idea_id
       WHERE i.series_id = ? AND p.deleted_at IS NULL AND i.deleted_at IS NULL
       ORDER BY p.scheduled_at IS NULL, p.scheduled_at, p.created_at`,
      [seriesId],
    );
    const found = await Promise.all(rows.map((r) => posts.get(r.id)));
    return found.flatMap((p) => (p ? [p] : []));
  }

  return {
    async create(input) {
      const series = createSeries(input, clock());
      await db.execute(
        `INSERT INTO series (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          series.id,
          series.name,
          series.description,
          series.platformId,
          JSON.stringify(series.weekdays),
          series.time,
          series.frequency,
          series.anchorDate,
          series.template,
          series.remindBeforeHours,
          series.createdAt,
          series.updatedAt,
        ],
      );
      return series;
    },
    async update(id, patch) {
      const current = await get(id);
      if (!current || current.deletedAt) return null;
      const next = updateSeries(current, patch, clock());
      await db.execute(
        `UPDATE series SET name = ?, description = ?, platform_id = ?, weekdays = ?, time = ?, frequency = ?,
         anchor_date = ?, template = ?, remind_before_hours = ?, updated_at = ? WHERE id = ?`,
        [
          next.name,
          next.description,
          next.platformId,
          JSON.stringify(next.weekdays),
          next.time,
          next.frequency,
          next.anchorDate,
          next.template,
          next.remindBeforeHours,
          next.updatedAt,
          id,
        ],
      );
      return next;
    },
    async softDelete(id) {
      const ts = clock().toISOString();
      await db.transaction(async (tx) => {
        await tx.execute("UPDATE ideas SET series_id = NULL, updated_at = ? WHERE series_id = ?", [
          ts,
          id,
        ]);
        await tx.execute("UPDATE series SET deleted_at = ?, updated_at = ? WHERE id = ?", [
          ts,
          ts,
          id,
        ]);
      });
    },
    get,
    async list() {
      const rows = await db.select<SeriesRow>(
        `SELECT ${COLUMNS} FROM series WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE, created_at`,
      );
      return rows.map(toSeries);
    },
    async assignIdea(ideaId, seriesId) {
      await ideas.update(ideaId, { seriesId });
    },
    listIdeas,
    listPosts,
    async listSlotPosts(seriesId) {
      const list = await listPosts(seriesId);
      return list.map((p) => ({ id: p.id, scheduledAt: p.scheduledAt }));
    },
  };
}
