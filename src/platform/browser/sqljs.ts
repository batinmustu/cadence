import initSqlJs, { type SqlValue as SqlJsValue } from "sql.js";
import type { Database, SqlValue } from "../types";

/** In-memory SQLite (sql.js) that runs the same SQL as the desktop app. */
export async function createSqlJsDatabase(
  locateFile?: (file: string) => string,
): Promise<Database> {
  const SQL = await initSqlJs(locateFile ? { locateFile } : {});
  const raw = new SQL.Database();
  raw.run("PRAGMA foreign_keys = ON");
  let depth = 0;

  const db: Database = {
    async select<T>(sql: string, params: SqlValue[] = []) {
      const stmt = raw.prepare(sql);
      try {
        stmt.bind(params as SqlJsValue[]);
        const rows: T[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as T);
        return rows;
      } finally {
        stmt.free();
      }
    },
    async execute(sql, params = []) {
      raw.run(sql, params as SqlJsValue[]);
    },
    async transaction(fn) {
      // Nested calls join the outer transaction.
      if (depth > 0) return fn(db);
      depth++;
      raw.run("BEGIN");
      try {
        const result = await fn(db);
        raw.run("COMMIT");
        return result;
      } catch (error) {
        raw.run("ROLLBACK");
        throw error;
      } finally {
        depth--;
      }
    },
  };
  return db;
}
