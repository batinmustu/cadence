import { backupFileName } from "../../core/backup";
import type { Database, Files } from "../../platform/types";

/** Makes today's backup copy (the desktop shell keeps the last 7). Never throws. */
export async function runDailyBackup(db: Database, files: Files, now = new Date()): Promise<void> {
  try {
    const target = await files.backupTarget(backupFileName(now));
    // VACUUM INTO writes a consistent copy even while the database is open.
    if (target) await db.execute("VACUUM INTO ?", [target]);
  } catch {
    // A failed backup must never stop the app from starting.
  }
}
