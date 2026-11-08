import {
  buildExport,
  type ExportFile,
  type Row,
  TABLE_ORDER,
  validateExport,
} from "../core/backup";
import type { Database, SqlValue } from "../platform/types";
import { prepareDatabase } from "./index";

export async function exportAll(db: Database, now = new Date()): Promise<string> {
  const tables: Record<string, Row[]> = {};
  for (const name of TABLE_ORDER) {
    tables[name] = await db.select<Row>(`SELECT * FROM ${name} ORDER BY id`);
  }
  return JSON.stringify(buildExport(tables, now), null, 2);
}

/** Import only into a database with no user content (seeded presets are fine). */
export async function isEmptyOfContent(db: Database): Promise<boolean> {
  for (const table of ["ideas", "series", "posts", "tags"]) {
    const rows = await db.select<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
    if ((rows[0]?.n ?? 0) > 0) return false;
  }
  return true;
}

export type ImportResult =
  | { ok: true }
  | { ok: false; reason: "notJson" | "notCadence" | "tooNew" | "invalid" | "notEmpty" | "failed" };

async function wipe(db: Database): Promise<void> {
  for (const name of [...TABLE_ORDER].reverse()) await db.execute(`DELETE FROM ${name}`);
}

async function insertAll(db: Database, data: ExportFile): Promise<void> {
  for (const name of TABLE_ORDER) {
    for (const row of data.tables[name] ?? []) {
      const cols = Object.keys(row);
      const values = cols.map((c) => row[c] as SqlValue);
      await db.execute(
        `INSERT INTO ${name} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
        values,
      );
    }
  }
}

/**
 * Validates first, so a bad file changes nothing. The desktop SQL plugin has no real
 * transactions (see tauri/database.ts), so if inserting still fails the database is
 * emptied and re-seeded instead of being left half-imported.
 */
export async function importAll(db: Database, text: string): Promise<ImportResult> {
  const checked = validateExport(text);
  if (!checked.ok) return { ok: false, reason: checked.reason };
  if (!(await isEmptyOfContent(db))) return { ok: false, reason: "notEmpty" };
  try {
    await wipe(db);
    await insertAll(db, checked.data);
    return { ok: true };
  } catch {
    await wipe(db).catch(() => {});
    await prepareDatabase(db).catch(() => {});
    return { ok: false, reason: "failed" };
  }
}
