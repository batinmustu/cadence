import type { Database } from "../platform/types";
import { runMigrations } from "./migrate";
import { seedPresets } from "./seed/presets";

/** Brings a fresh or existing database up to date. Safe to call on every start. */
export async function prepareDatabase(db: Database): Promise<void> {
  await runMigrations(db);
  await seedPresets(db);
}
