export type FieldKind = "text" | "longtext" | "parts" | "outline" | "checklist";

interface FieldBase {
  key: string;
  /** i18n key for presets, plain text for user-made types. */
  label?: string;
  /** Selects the character counting rule (see issue #13); never a platform name. */
  countRule?: string;
}

export type FieldDef =
  | (FieldBase & { kind: "text" | "longtext"; max?: number })
  | (FieldBase & { kind: "parts"; maxPerPart?: number; maxParts?: number })
  | (FieldBase & { kind: "outline" })
  | (FieldBase & { kind: "checklist"; items: string[] });

export interface FieldSchema {
  fields: FieldDef[];
}

export interface OutlineItem {
  text: string;
  timestamp?: string;
}

export type FieldValue =
  | string
  | string[]
  | OutlineItem[]
  /** Checklist: item label → done. */
  | Record<string, boolean>;

export type FieldValues = Record<string, FieldValue>;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const KINDS: readonly FieldKind[] = ["text", "longtext", "parts", "outline", "checklist"];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function optionalPositiveInt(v: unknown): boolean {
  return v === undefined || (typeof v === "number" && Number.isInteger(v) && v > 0);
}

function parseField(raw: unknown, index: number): ParseResult<FieldDef> {
  const at = `fields[${index}]`;
  if (!isRecord(raw)) return { ok: false, error: `${at} must be an object` };
  const { key, kind, label, countRule } = raw;
  if (typeof key !== "string" || key === "") return { ok: false, error: `${at}.key is required` };
  if (typeof kind !== "string" || !KINDS.includes(kind as FieldKind))
    return { ok: false, error: `${at}.kind is unknown` };
  if (label !== undefined && typeof label !== "string")
    return { ok: false, error: `${at}.label must be a string` };
  if (countRule !== undefined && typeof countRule !== "string")
    return { ok: false, error: `${at}.countRule must be a string` };
  const base: FieldBase = { key };
  if (label !== undefined) base.label = label;
  if (countRule !== undefined) base.countRule = countRule;

  switch (kind as FieldKind) {
    case "text":
    case "longtext": {
      if (!optionalPositiveInt(raw.max))
        return { ok: false, error: `${at}.max must be a positive integer` };
      const field: FieldDef = { ...base, kind: kind as "text" | "longtext" };
      if (typeof raw.max === "number") field.max = raw.max;
      return { ok: true, value: field };
    }
    case "parts": {
      if (!optionalPositiveInt(raw.maxPerPart) || !optionalPositiveInt(raw.maxParts))
        return { ok: false, error: `${at}.maxPerPart and maxParts must be positive integers` };
      const field: FieldDef = { ...base, kind: "parts" };
      if (typeof raw.maxPerPart === "number") field.maxPerPart = raw.maxPerPart;
      if (typeof raw.maxParts === "number") field.maxParts = raw.maxParts;
      return { ok: true, value: field };
    }
    case "outline":
      return { ok: true, value: { ...base, kind: "outline" } };
    case "checklist": {
      const items = raw.items;
      if (!Array.isArray(items) || !items.every((i) => typeof i === "string"))
        return { ok: false, error: `${at}.items must be a list of strings` };
      return { ok: true, value: { ...base, kind: "checklist", items: items as string[] } };
    }
  }
}

/** Validates the JSON stored in `content_types.field_schema`. */
export function parseFieldSchema(json: string): ParseResult<FieldSchema> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "not valid JSON" };
  }
  if (!isRecord(raw) || !Array.isArray(raw.fields))
    return { ok: false, error: "fields must be a list" };
  const fields: FieldDef[] = [];
  const seen = new Set<string>();
  for (const [i, f] of raw.fields.entries()) {
    const parsed = parseField(f, i);
    if (!parsed.ok) return parsed;
    if (seen.has(parsed.value.key))
      return { ok: false, error: `duplicate key "${parsed.value.key}"` };
    seen.add(parsed.value.key);
    fields.push(parsed.value);
  }
  return { ok: true, value: { fields } };
}

export type FieldErrorCode = "wrongShape" | "overLimit" | "tooManyParts" | "unknownItem";

export interface FieldError {
  key: string;
  code: FieldErrorCode;
  /** Index of the offending part or item, when the error is about one. */
  index?: number;
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

const isOutline = (v: unknown): v is OutlineItem[] =>
  Array.isArray(v) &&
  v.every(
    (x) =>
      isRecord(x) &&
      typeof x.text === "string" &&
      (x.timestamp === undefined || typeof x.timestamp === "string"),
  );

const isChecklist = (v: unknown): v is Record<string, boolean> =>
  isRecord(v) && Object.values(v).every((x) => typeof x === "boolean");

/** Length in code points; platform-specific counting is layered on in #13. */
const len = (s: string): number => [...s].length;

/** Missing values are fine (a draft can be empty); wrong shapes and limits are not. */
export function validateFields(schema: FieldSchema, values: Record<string, unknown>): FieldError[] {
  const errors: FieldError[] = [];
  for (const field of schema.fields) {
    const value = values[field.key];
    if (value === undefined) continue;
    const key = field.key;
    switch (field.kind) {
      case "text":
      case "longtext":
        if (typeof value !== "string") errors.push({ key, code: "wrongShape" });
        else if (field.max !== undefined && len(value) > field.max)
          errors.push({ key, code: "overLimit" });
        break;
      case "parts":
        if (!isStringArray(value)) {
          errors.push({ key, code: "wrongShape" });
          break;
        }
        if (field.maxParts !== undefined && value.length > field.maxParts)
          errors.push({ key, code: "tooManyParts" });
        for (const [index, part] of value.entries())
          if (field.maxPerPart !== undefined && len(part) > field.maxPerPart)
            errors.push({ key, code: "overLimit", index });
        break;
      case "outline":
        if (!isOutline(value)) errors.push({ key, code: "wrongShape" });
        break;
      case "checklist":
        if (!isChecklist(value)) errors.push({ key, code: "wrongShape" });
        else
          for (const item of Object.keys(value))
            if (!field.items.includes(item)) errors.push({ key, code: "unknownItem" });
        break;
    }
  }
  return errors;
}
