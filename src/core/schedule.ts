import type { FieldSchema } from "./fieldSchema";

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO UTC → `YYYY-MM-DD` and `HH:mm` in the local time zone, for date/time inputs. */
export function toLocalParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Local date + time inputs → ISO UTC; null when either is missing or invalid. */
export function fromLocalParts(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  if (y === undefined || mo === undefined || d === undefined || h === undefined || mi === undefined)
    return null;
  const local = new Date(y, mo - 1, d, h, mi);
  // Rejects overflow such as 2026-02-31 that Date silently rolls over.
  if (local.getMonth() !== mo - 1 || local.getDate() !== d) return null;
  return local.toISOString();
}

/** Plain text of one field value, for copying. */
function fieldText(kind: string, value: unknown): string {
  if (typeof value === "string") return value;
  if (kind === "parts" && Array.isArray(value))
    return value.filter((v) => typeof v === "string").join("\n\n");
  if (kind === "outline" && Array.isArray(value))
    return value
      .map((o: { text?: string; timestamp?: string }) =>
        o.timestamp ? `${o.timestamp} ${o.text ?? ""}` : (o.text ?? ""),
      )
      .join("\n");
  return "";
}

/** The whole variant as text: text-like fields in schema order, checklists skipped. */
export function variantText(schema: FieldSchema, values: Record<string, unknown>): string {
  return schema.fields
    .filter((f) => f.kind !== "checklist")
    .map((f) => fieldText(f.kind, values[f.key]).trim())
    .filter((t) => t !== "")
    .join("\n\n");
}
