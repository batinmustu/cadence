import type { Database } from "../platform/types";

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

// Vite inlines the .sql files; filenames are `NNNN_name.sql`.
const files = import.meta.glob("./migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export function loadMigrations(source: Record<string, string> = files): Migration[] {
  return Object.entries(source)
    .map(([path, sql]) => {
      const match = /(\d{4})_([\w-]+)\.sql$/.exec(path);
      if (!match) throw new Error(`Bad migration filename: ${path}`);
      return { version: Number(match[1]), name: match[2] ?? "", sql };
    })
    .sort((a, b) => a.version - b.version);
}

/** Splits on `;` at line ends; our migrations contain no semicolons inside strings. */
export function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

/** Applies pending migrations in order, each in a transaction. Returns applied versions. */
export async function runMigrations(
  db: Database,
  migrations: Migration[] = loadMigrations(),
): Promise<number[]> {
  await db.execute(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)",
  );
  const done = new Set(
    (await db.select<{ version: number }>("SELECT version FROM schema_migrations")).map(
      (r) => r.version,
    ),
  );
  const applied: number[] = [];
  for (const m of migrations) {
    if (done.has(m.version)) continue;
    await db.transaction(async (tx) => {
      for (const statement of splitStatements(m.sql)) await tx.execute(statement);
      await tx.execute(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
        [m.version, m.name, new Date().toISOString()],
      );
    });
    applied.push(m.version);
  }
  return applied;
}
