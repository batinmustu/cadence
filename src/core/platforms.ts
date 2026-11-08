import { type FieldDef, type FieldSchema, parseFieldSchema } from "./fieldSchema";

// Pure helpers for the platform / content type settings. No storage, no UI.

export const COUNT_RULES = ["plain", "x"] as const;

export function validateName(name: string): boolean {
  return name.trim() !== "";
}

/** Moves the item with `id` one step; returns the same order at the edges. */
export function moveId(ids: string[], id: string, step: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + step;
  if (from === -1 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) next.splice(to, 0, moved);
  return next;
}

export function parseHiddenIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** A stable machine key from a label; unique within the schema ("Video title" → "video_title"). */
export function fieldKeyFor(label: string, taken: string[]): string {
  const base =
    label
      .trim()
      .toLocaleLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "") || "field";
  let key = base;
  for (let n = 2; taken.includes(key); n++) key = `${base}_${n}`;
  return key;
}

export function newField(kind: FieldDef["kind"], label: string, taken: string[]): FieldDef {
  const base = { key: fieldKeyFor(label, taken), label: label.trim() };
  switch (kind) {
    case "text":
    case "longtext":
      return { ...base, kind };
    case "parts":
      return { ...base, kind };
    case "outline":
      return { ...base, kind };
    case "checklist":
      return { ...base, kind, items: [] };
  }
}

export type SchemaCheck = { ok: true; schema: FieldSchema } | { ok: false; error: string };

/** Round-trips through the same validator the database uses (issue #12). */
export function checkSchema(fields: FieldDef[]): SchemaCheck {
  if (fields.length === 0) return { ok: false, error: "at least one field is required" };
  const cleaned = fields.map((f) =>
    f.kind === "checklist"
      ? { ...f, items: f.items.map((i) => i.trim()).filter(Boolean) }
      : { ...f },
  );
  const parsed = parseFieldSchema(JSON.stringify({ fields: cleaned }));
  return parsed.ok ? { ok: true, schema: parsed.value } : { ok: false, error: parsed.error };
}
