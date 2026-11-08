import { uuidv7 } from "../../core/ids";
import { normalizeTagName, type Tag } from "../../core/tags";
import type { Database } from "../../platform/types";

export interface TagsRepository {
  list(): Promise<Tag[]>;
  /** Returns the existing tag with this name (any case) or creates it. Null for an empty name. */
  findOrCreate(name: string): Promise<Tag | null>;
  /** Removes the tag from every idea and deletes it. Tags have no deleted_at column. */
  remove(id: string): Promise<void>;
}

export function createTagsRepository(
  db: Database,
  clock: () => Date = () => new Date(),
): TagsRepository {
  return {
    async remove(id) {
      await db.transaction(async (tx) => {
        await tx.execute("DELETE FROM idea_tags WHERE tag_id = ?", [id]);
        await tx.execute("DELETE FROM tags WHERE id = ?", [id]);
      });
    },
    list: () => db.select<Tag>("SELECT id, name FROM tags ORDER BY name COLLATE NOCASE"),
    async findOrCreate(raw) {
      const name = normalizeTagName(raw);
      if (!name) return null;
      const found = await db.select<Tag>("SELECT id, name FROM tags WHERE lower(name) = lower(?)", [
        name,
      ]);
      if (found[0]) return found[0];
      const now = clock();
      const id = uuidv7(now.getTime());
      const ts = now.toISOString();
      await db.execute("INSERT INTO tags (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)", [
        id,
        name,
        ts,
        ts,
      ]);
      return { id, name };
    },
  };
}
