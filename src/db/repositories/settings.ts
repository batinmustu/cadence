import { uuidv7 } from "../../core/ids";
import type { Database } from "../../platform/types";

export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export function createSettingsRepository(
  db: Database,
  clock: () => Date = () => new Date(),
): SettingsRepository {
  return {
    async get(key) {
      const rows = await db.select<{ value: string }>("SELECT value FROM settings WHERE key = ?", [
        key,
      ]);
      return rows[0]?.value ?? null;
    },
    async set(key, value) {
      const ts = clock().toISOString();
      await db.execute(
        "INSERT INTO settings (id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        [uuidv7(clock().getTime()), key, value, ts, ts],
      );
    },
  };
}
