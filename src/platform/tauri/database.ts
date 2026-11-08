import SqlDatabase from "@tauri-apps/plugin-sql";
import type { Database, SqlValue } from "../types";

// The file lives in the app-data directory (resolved by the plugin).
// The plugin uses a connection pool, so BEGIN/COMMIT across calls is not
// reliable; transaction() therefore runs statements sequentially. All seeds and
// migrations are written to be re-runnable (IF NOT EXISTS / INSERT OR IGNORE).
export function createTauriDatabase(path = "sqlite:cadence.db"): Database {
  const connection = SqlDatabase.load(path);
  const db: Database = {
    async select<T>(sql: string, params: SqlValue[] = []) {
      return (await connection).select<T[]>(sql, params);
    },
    async execute(sql, params = []) {
      await (await connection).execute(sql, params);
    },
    async transaction(fn) {
      return fn(db);
    },
  };
  return db;
}
