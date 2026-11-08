import { type FieldSchema, parseFieldSchema } from "../../core/fieldSchema";
import { uuidv7 } from "../../core/ids";
import { parseHiddenIds, validateName } from "../../core/platforms";
import type { Database } from "../../platform/types";
import { createSettingsRepository } from "./settings";

export const HIDDEN_KEY = "platforms.hidden";

export interface PlatformRow {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  isPreset: boolean;
  hidden: boolean;
}

export interface ContentTypeRow {
  id: string;
  platformId: string;
  name: string;
  schema: FieldSchema;
  sortOrder: number;
  isPreset: boolean;
}

export type RemoveResult = "removed" | "preset" | "inUse";

export interface PlatformsRepository {
  list(): Promise<PlatformRow[]>;
  /** Platforms the user has not hidden: what pickers should offer. */
  listVisible(): Promise<{ id: string; name: string }[]>;
  create(name: string): Promise<PlatformRow>;
  rename(id: string, name: string): Promise<void>;
  /** Writes sort_order from the given id order. */
  reorder(ids: string[]): Promise<void>;
  setHidden(id: string, hidden: boolean): Promise<void>;
  /** Presets are hidden, never deleted; platforms in use cannot be deleted. */
  remove(id: string): Promise<RemoveResult>;
  listContentTypes(platformId: string): Promise<ContentTypeRow[]>;
  saveContentType(input: {
    id?: string;
    platformId: string;
    name: string;
    schema: FieldSchema;
  }): Promise<void>;
  removeContentType(id: string): Promise<RemoveResult>;
}

interface PRow {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  is_preset: number;
}

export function createPlatformsRepository(
  db: Database,
  clock: () => Date = () => new Date(),
): PlatformsRepository {
  const settings = createSettingsRepository(db, clock);
  const hiddenIds = async () => parseHiddenIds(await settings.get(HIDDEN_KEY));
  const count = async (sql: string, id: string) =>
    (await db.select<{ n: number }>(sql, [id]))[0]?.n ?? 0;

  return {
    async list() {
      const [rows, hidden] = await Promise.all([
        db.select<PRow>(
          "SELECT id, name, icon, sort_order, is_preset FROM platforms ORDER BY sort_order, name",
        ),
        hiddenIds(),
      ]);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        sortOrder: r.sort_order,
        isPreset: r.is_preset === 1,
        hidden: hidden.includes(r.id),
      }));
    },
    async listVisible() {
      const [rows, hidden] = await Promise.all([
        db.select<{ id: string; name: string }>(
          "SELECT id, name FROM platforms ORDER BY sort_order, name",
        ),
        hiddenIds(),
      ]);
      return rows.filter((r) => !hidden.includes(r.id));
    },
    async create(name) {
      if (!validateName(name)) throw new Error("Invalid name");
      const now = clock();
      const ts = now.toISOString();
      const id = uuidv7(now.getTime());
      const [max] = await db.select<{ n: number | null }>(
        "SELECT MAX(sort_order) AS n FROM platforms",
      );
      const sortOrder = (max?.n ?? -1) + 1;
      await db.execute(
        "INSERT INTO platforms (id, name, icon, sort_order, is_preset, created_at, updated_at) VALUES (?, ?, 'globe', ?, 0, ?, ?)",
        [id, name.trim(), sortOrder, ts, ts],
      );
      return { id, name: name.trim(), icon: "globe", sortOrder, isPreset: false, hidden: false };
    },
    async rename(id, name) {
      if (!validateName(name)) throw new Error("Invalid name");
      await db.execute("UPDATE platforms SET name = ?, updated_at = ? WHERE id = ?", [
        name.trim(),
        clock().toISOString(),
        id,
      ]);
    },
    async reorder(ids) {
      const ts = clock().toISOString();
      await db.transaction(async (tx) => {
        for (const [i, id] of ids.entries()) {
          await tx.execute("UPDATE platforms SET sort_order = ?, updated_at = ? WHERE id = ?", [
            i,
            ts,
            id,
          ]);
        }
      });
    },
    async setHidden(id, hidden) {
      const rest = (await hiddenIds()).filter((x) => x !== id);
      await settings.set(HIDDEN_KEY, JSON.stringify(hidden ? [...rest, id] : rest));
    },
    async remove(id) {
      const [p] = await db.select<{ is_preset: number }>(
        "SELECT is_preset FROM platforms WHERE id = ?",
        [id],
      );
      if (!p) return "removed";
      if (p.is_preset === 1) return "preset";
      const used =
        (await count("SELECT COUNT(*) AS n FROM series WHERE platform_id = ?", id)) +
        (await count("SELECT COUNT(*) AS n FROM idea_platforms WHERE platform_id = ?", id)) +
        (await count(
          "SELECT COUNT(*) AS n FROM posts WHERE content_type_id IN (SELECT id FROM content_types WHERE platform_id = ?)",
          id,
        )) +
        (await count(
          "SELECT COUNT(*) AS n FROM ai_commands WHERE content_type_id IN (SELECT id FROM content_types WHERE platform_id = ?)",
          id,
        ));
      if (used > 0) return "inUse";
      await db.transaction(async (tx) => {
        await tx.execute("DELETE FROM content_types WHERE platform_id = ?", [id]);
        await tx.execute("DELETE FROM platforms WHERE id = ?", [id]);
      });
      return "removed";
    },
    async listContentTypes(platformId) {
      const rows = await db.select<{
        id: string;
        platform_id: string;
        name: string;
        field_schema: string;
        sort_order: number;
        is_preset: number;
      }>(
        "SELECT id, platform_id, name, field_schema, sort_order, is_preset FROM content_types WHERE platform_id = ? ORDER BY sort_order, name",
        [platformId],
      );
      return rows.map((r) => {
        const parsed = parseFieldSchema(r.field_schema);
        return {
          id: r.id,
          platformId: r.platform_id,
          name: r.name,
          schema: parsed.ok ? parsed.value : { fields: [] },
          sortOrder: r.sort_order,
          isPreset: r.is_preset === 1,
        };
      });
    },
    async saveContentType({ id, platformId, name, schema }) {
      if (!validateName(name)) throw new Error("Invalid name");
      // Validate with the same parser the reader uses, so nothing unreadable is stored.
      const json = JSON.stringify(schema);
      if (!parseFieldSchema(json).ok) throw new Error("Invalid schema");
      const now = clock();
      const ts = now.toISOString();
      if (id) {
        await db.execute(
          "UPDATE content_types SET name = ?, field_schema = ?, updated_at = ? WHERE id = ?",
          [name.trim(), json, ts, id],
        );
        return;
      }
      const [max] = await db.select<{ n: number | null }>(
        "SELECT MAX(sort_order) AS n FROM content_types WHERE platform_id = ?",
        [platformId],
      );
      await db.execute(
        "INSERT INTO content_types (id, platform_id, name, field_schema, sort_order, is_preset, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
        [uuidv7(now.getTime()), platformId, name.trim(), json, (max?.n ?? -1) + 1, ts, ts],
      );
    },
    async removeContentType(id) {
      const [c] = await db.select<{ is_preset: number }>(
        "SELECT is_preset FROM content_types WHERE id = ?",
        [id],
      );
      if (!c) return "removed";
      if (c.is_preset === 1) return "preset";
      const used =
        (await count("SELECT COUNT(*) AS n FROM posts WHERE content_type_id = ?", id)) +
        (await count("SELECT COUNT(*) AS n FROM ai_commands WHERE content_type_id = ?", id));
      if (used > 0) return "inUse";
      await db.execute("DELETE FROM content_types WHERE id = ?", [id]);
      return "removed";
    },
  };
}
