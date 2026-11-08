import { countChars } from "./charCount";
import type { FieldDef, FieldSchema, FieldValue } from "./fieldSchema";
import { splitIntoParts } from "./parts";

// Applies an AI result card to a variant's fields. Pure, so it is reusable on mobile.

export type ApplyMode = "replace" | "insertBelow" | "use";

export interface FieldPatch {
  key: string;
  value: FieldValue;
}

const BODY_KINDS = ["longtext", "parts", "text"] as const;

/** The field an AI result goes into: the first long text, else parts, else short text. */
export function targetField(schema: FieldSchema): FieldDef | null {
  for (const kind of BODY_KINDS) {
    const found = schema.fields.find((f) => f.kind === kind);
    if (found) return found;
  }
  return null;
}

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

function toParts(def: FieldDef & { kind: "parts" }, text: string): string[] {
  const max = def.maxPerPart ?? Number.POSITIVE_INFINITY;
  // Respect an existing numbering such as "1/ ..." by splitting on blank lines first.
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.replace(/^\d+\s*[/.)]\s+/, "").trim())
    .filter(Boolean);
  const out = blocks.flatMap((b) =>
    countChars(b, def.countRule ?? "plain") <= max
      ? [b]
      : splitIntoParts(b, max, def.countRule ?? "plain"),
  );
  return def.maxParts ? out.slice(0, def.maxParts) : out;
}

/**
 * `replace` overwrites the target field, `insertBelow` appends after the current
 * content, `use` puts a short result (a title idea) into the first short text
 * field and falls back to `replace` when the type has none.
 */
export function applyResult(
  schema: FieldSchema,
  values: Record<string, unknown>,
  mode: ApplyMode,
  text: string,
): FieldPatch | null {
  const clean = text.trim();
  if (!clean) return null;
  const def =
    mode === "use"
      ? (schema.fields.find((f) => f.kind === "text") ?? targetField(schema))
      : targetField(schema);
  if (!def) return null;
  const current = values[def.key];

  if (def.kind === "parts") {
    const parts = toParts(def, clean);
    return {
      key: def.key,
      value: mode === "insertBelow" ? [...asStrings(current), ...parts] : parts,
    };
  }
  if (def.kind === "text" || def.kind === "longtext") {
    const existing = asString(current).trimEnd();
    const sep = def.kind === "text" ? " " : "\n\n";
    const value = mode === "insertBelow" && existing ? `${existing}${sep}${clean}` : clean;
    return { key: def.key, value };
  }
  return null;
}
