// Pure format for the export file: building, validating and ordering rows.
// No database or UI here so the same code can serve a future mobile app.

export const EXPORT_FORMAT = "cadence-export";
export const EXPORT_VERSION = 1;

interface TableSpec {
  /** Columns that must be present in every row. */
  required: string[];
  /** Columns that may be present (defaults apply when absent). */
  optional: string[];
  /** column → table it points to (nullable references are skipped when null). */
  refs?: Record<string, string>;
}

const STAMPS = ["created_at", "updated_at"];

/** Insert order: parents before children. */
export const TABLES: Record<string, TableSpec> = {
  platforms: { required: ["id", "name", "icon", ...STAMPS], optional: ["sort_order", "is_preset"] },
  content_types: {
    required: ["id", "platform_id", "name", "field_schema", ...STAMPS],
    optional: ["sort_order", "is_preset"],
    refs: { platform_id: "platforms" },
  },
  series: {
    required: ["id", "name", "platform_id", "anchor_date", ...STAMPS],
    optional: [
      "description",
      "weekdays",
      "time",
      "frequency",
      "template",
      "remind_before_hours",
      "deleted_at",
    ],
    refs: { platform_id: "platforms" },
  },
  ideas: {
    required: ["id", "title", ...STAMPS],
    optional: ["note", "status", "series_id", "deleted_at"],
    refs: { series_id: "series" },
  },
  idea_platforms: {
    required: ["id", "idea_id", "platform_id", ...STAMPS],
    optional: [],
    refs: { idea_id: "ideas", platform_id: "platforms" },
  },
  posts: {
    required: ["id", "idea_id", "content_type_id", ...STAMPS],
    optional: [
      "fields",
      "status",
      "scheduled_at",
      "published_at",
      "published_url",
      "after_note",
      "deleted_at",
    ],
    refs: { idea_id: "ideas", content_type_id: "content_types" },
  },
  tags: { required: ["id", "name", ...STAMPS], optional: [] },
  idea_tags: {
    required: ["id", "idea_id", "tag_id", ...STAMPS],
    optional: [],
    refs: { idea_id: "ideas", tag_id: "tags" },
  },
  ai_commands: {
    required: ["id", "name", "prompt", ...STAMPS],
    optional: ["content_type_id", "sort_order", "is_preset", "returns_options"],
    refs: { content_type_id: "content_types" },
  },
  settings: { required: ["id", "key", "value", ...STAMPS], optional: [] },
};

export const TABLE_ORDER = Object.keys(TABLES);

export type Row = Record<string, string | number | null>;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  tables: Record<string, Row[]>;
}

export function buildExport(tables: Record<string, Row[]>, now: Date): ExportFile {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), tables };
}

export type ValidationResult =
  | { ok: true; data: ExportFile }
  | { ok: false; reason: "notJson" | "notCadence" | "tooNew" | "invalid"; detail: string };

const fail = (reason: "notJson" | "notCadence" | "tooNew" | "invalid", detail = "") =>
  ({ ok: false, reason, detail }) as const;

const isScalar = (v: unknown): v is string | number | null =>
  v === null || typeof v === "string" || (typeof v === "number" && Number.isFinite(v));

/** Checks shape, columns and references. Never touches the database. */
export function validateExport(text: string): ValidationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("notJson");
  }
  if (typeof raw !== "object" || raw === null) return fail("notCadence");
  const file = raw as Record<string, unknown>;
  if (file.format !== EXPORT_FORMAT) return fail("notCadence");
  if (typeof file.version !== "number" || !Number.isInteger(file.version) || file.version < 1) {
    return fail("invalid", "version");
  }
  if (file.version > EXPORT_VERSION) return fail("tooNew", String(file.version));
  const tables = file.tables;
  if (typeof tables !== "object" || tables === null) return fail("invalid", "tables");

  const given = tables as Record<string, unknown>;
  for (const name of Object.keys(given)) {
    if (!(name in TABLES)) return fail("invalid", `unknown table ${name}`);
  }
  const clean: Record<string, Row[]> = {};
  const ids: Record<string, Set<string>> = {};
  for (const name of TABLE_ORDER) {
    const spec = TABLES[name];
    const rows = given[name] ?? [];
    if (!spec || !Array.isArray(rows)) return fail("invalid", name);
    const known = new Set([...spec.required, ...spec.optional]);
    const seen = new Set<string>();
    for (const row of rows) {
      if (typeof row !== "object" || row === null || Array.isArray(row))
        return fail("invalid", name);
      const r = row as Record<string, unknown>;
      for (const [col, value] of Object.entries(r)) {
        if (!known.has(col) || !isScalar(value)) return fail("invalid", `${name}.${col}`);
      }
      for (const col of spec.required) {
        if (typeof r[col] !== "string" || r[col] === "") return fail("invalid", `${name}.${col}`);
      }
      const id = r.id as string;
      if (seen.has(id)) return fail("invalid", `${name}: duplicate id`);
      seen.add(id);
      for (const [col, target] of Object.entries(spec.refs ?? {})) {
        const ref = r[col];
        if (ref === null || ref === undefined) continue;
        if (typeof ref !== "string" || !ids[target]?.has(ref)) {
          return fail("invalid", `${name}.${col}`);
        }
      }
    }
    ids[name] = seen;
    clean[name] = rows as Row[];
  }
  return {
    ok: true,
    data: {
      format: EXPORT_FORMAT,
      version: file.version,
      exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : "",
      tables: clean,
    },
  };
}

/** `cadence-export-2026-11-08.json` in the local calendar day. */
export function exportFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `cadence-export-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

/** `cadence-2026-11-08.db` (local day) — the daily backup name. */
export function backupFileName(now: Date): string {
  return exportFileName(now).replace("-export", "").replace(".json", ".db");
}
