import type { FieldDef, FieldSchema, FieldValue, FieldValues, OutlineItem } from "./fieldSchema";

// Builds the system and user prompt sent to the AI provider. Pure text in,
// pure text out, so it can be reused on mobile and snapshot-tested.

export interface PromptInput {
  /** The user's tone-of-voice note ("sent with every request"). */
  tone?: string;
  /** Name of the content type, e.g. "Thread". Data, never branched on. */
  contentTypeName?: string;
  schema?: FieldSchema;
  values?: FieldValues;
  /** The command's own instruction, e.g. "Shorten this". */
  commandPrompt: string;
  /** Extra text the user typed next to the command. */
  freeText?: string;
  /** True when the command should return alternatives as JSON. */
  expectsOptions?: boolean;
}

export interface BuiltPrompt {
  system: string;
  prompt: string;
}

const BASE_SYSTEM =
  "You are a writing assistant inside a social media planning app. Help the user write clear, natural content. Reply with the content only, without preamble or commentary.";

const OPTIONS_CONTRACT =
  'Return your answer as JSON only, in exactly this shape: {"options": ["first option", "second option"]}. Do not wrap it in code fences or add any other text.';

function fieldLabel(def: FieldDef): string {
  return def.label ?? def.key;
}

function describeLimit(def: FieldDef): string {
  switch (def.kind) {
    case "text":
    case "longtext":
      return def.max ? ` (max ${def.max} characters)` : "";
    case "parts": {
      const per = def.maxPerPart ? `max ${def.maxPerPart} characters per part` : "";
      const count = def.maxParts ? `max ${def.maxParts} parts` : "";
      const joined = [per, count].filter(Boolean).join(", ");
      return joined ? ` (${joined})` : "";
    }
    default:
      return "";
  }
}

function formatValue(def: FieldDef, value: FieldValue | undefined): string {
  if (value === undefined) return "";
  switch (def.kind) {
    case "text":
    case "longtext":
      return typeof value === "string" ? value.trim() : "";
    case "parts":
      return Array.isArray(value)
        ? (value as unknown[])
            .filter((p): p is string => typeof p === "string")
            .map((p, i) => `${i + 1}/ ${p.trim()}`)
            .join("\n")
        : "";
    case "outline":
      return Array.isArray(value)
        ? (value as unknown[])
            .filter((o): o is OutlineItem => typeof o === "object" && o !== null)
            .map((o) => `- ${o.timestamp ? `[${o.timestamp}] ` : ""}${o.text}`)
            .join("\n")
        : "";
    case "checklist":
      return "";
  }
}

/** Describes the content type so the model respects its fields and limits. */
export function describeSchema(name: string | undefined, schema: FieldSchema): string {
  const lines = schema.fields
    .filter((f) => f.kind !== "checklist")
    .map((f) => `- ${fieldLabel(f)}: ${f.kind}${describeLimit(f)}`);
  const title = name ? `Content type: ${name}` : "Content type";
  return [`${title}. Fields:`, ...lines].join("\n");
}

/** Current content, one block per non-empty field. Checklists are skipped. */
export function describeValues(schema: FieldSchema, values: FieldValues): string {
  return schema.fields
    .map((def) => ({ def, text: formatValue(def, values[def.key]) }))
    .filter((x) => x.text !== "")
    .map((x) => `[${fieldLabel(x.def)}]\n${x.text}`)
    .join("\n\n");
}

export function buildPrompt(input: PromptInput): BuiltPrompt {
  const systemParts = [BASE_SYSTEM];
  const tone = input.tone?.trim();
  if (tone) systemParts.push(`The user's tone of voice:\n${tone}`);
  if (input.schema) systemParts.push(describeSchema(input.contentTypeName, input.schema));
  if (input.expectsOptions) systemParts.push(OPTIONS_CONTRACT);

  const promptParts = [input.commandPrompt.trim()];
  const free = input.freeText?.trim();
  if (free) promptParts.push(`Additional instructions from the user:\n${free}`);
  if (input.schema && input.values) {
    const current = describeValues(input.schema, input.values);
    if (current) promptParts.push(`Current content:\n${current}`);
  }
  return { system: systemParts.join("\n\n"), prompt: promptParts.join("\n\n") };
}

/**
 * Reads an answer to a command that asked for options. Models sometimes wrap
 * the JSON in code fences or ignore the contract, so plain text is a fallback.
 */
export function parseOptions(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];
  const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const data: unknown = JSON.parse(unfenced.slice(start, end + 1));
      if (typeof data === "object" && data !== null && "options" in data) {
        const options = (data as { options: unknown }).options;
        if (Array.isArray(options)) {
          const strings = options
            .filter((o): o is string => typeof o === "string")
            .map((o) => o.trim())
            .filter(Boolean);
          if (strings.length > 0) return strings;
        }
      }
    } catch {
      // fall through to plain text
    }
  }
  return [text];
}
