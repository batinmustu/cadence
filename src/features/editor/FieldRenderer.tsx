import type { TFunction } from "i18next";
import { ArrowDown, ArrowUp, Check, Copy, Plus, Scissors, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input, Textarea, Toggle } from "../../components";
import { countChars } from "../../core/charCount";
import type { FieldDef, FieldSchema, FieldValues, OutlineItem } from "../../core/fieldSchema";
import { splitIntoParts } from "../../core/parts";
import { platform } from "../../platform";

interface Props {
  schema: FieldSchema;
  /** Raw stored values; wrong shapes are treated as empty instead of crashing. */
  values: Record<string, unknown>;
  onChange: (key: string, value: FieldValues[string]) => void;
}

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asStrings = (v: unknown): string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : [];
const asOutline = (v: unknown): OutlineItem[] =>
  Array.isArray(v)
    ? v.filter(
        (x): x is OutlineItem =>
          typeof x === "object" && x !== null && typeof (x as OutlineItem).text === "string",
      )
    : [];
const asChecklist = (v: unknown): Record<string, boolean> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, boolean>) : {};

export function Counter({ count, max }: { count: number; max?: number | undefined }) {
  const over = max !== undefined && count > max;
  return (
    <span
      data-over={over}
      className={`text-xs tabular-nums ${over ? "font-semibold text-text" : "text-text-3"}`}
    >
      {max === undefined ? count : `${count} / ${max}`}
    </span>
  );
}

export function FieldRenderer({ schema, values, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      {schema.fields.map((field) => (
        <section key={field.key} className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-3">
            {fieldLabel(field, t)}
          </h3>
          <Field field={field} value={values[field.key]} onChange={(v) => onChange(field.key, v)} />
        </section>
      ))}
    </div>
  );
}

function fieldLabel(field: FieldDef, t: TFunction) {
  const raw = field.label ?? field.key;
  return t(raw, { defaultValue: raw });
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: FieldValues[string]) => void;
}) {
  const { t } = useTranslation();
  const label = fieldLabel(field, t);
  switch (field.kind) {
    case "text": {
      const text = asString(value);
      return (
        <div className="flex items-center gap-2">
          <Input aria-label={label} value={text} onChange={(e) => onChange(e.target.value)} />
          {field.max !== undefined ? (
            <Counter count={countChars(text, field.countRule)} max={field.max} />
          ) : null}
        </div>
      );
    }
    case "longtext": {
      const text = asString(value);
      return (
        <div className="flex flex-col items-end gap-1">
          <Textarea
            aria-label={label}
            minRows={5}
            value={text}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.max !== undefined ? (
            <Counter count={countChars(text, field.countRule)} max={field.max} />
          ) : null}
        </div>
      );
    }
    case "parts":
      return <Parts field={field} label={label} parts={asStrings(value)} onChange={onChange} />;
    case "outline":
      return <Outline label={label} items={asOutline(value)} onChange={onChange} />;
    case "checklist": {
      const done = asChecklist(value);
      return (
        <div className="flex flex-wrap gap-2">
          {field.items.map((item) => (
            <Toggle
              key={item}
              pressed={done[item] === true}
              onPressedChange={(p) => onChange({ ...done, [item]: p })}
            >
              {done[item] === true ? <Check size={12} strokeWidth={2} aria-hidden /> : null}
              {item}
            </Toggle>
          ))}
        </div>
      );
    }
  }
}

function Parts({
  field,
  label,
  parts,
  onChange,
}: {
  field: Extract<FieldDef, { kind: "parts" }>;
  label: string;
  parts: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useTranslation();
  const list = parts.length === 0 ? [""] : parts;
  const atMax = field.maxParts !== undefined && list.length >= field.maxParts;
  const set = (i: number, text: string) => onChange(list.map((p, j) => (j === i ? text : p)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...list];
    const [item] = next.splice(i, 1);
    if (item === undefined) return;
    next.splice(i + by, 0, item);
    onChange(next);
  };
  const split = (i: number) => {
    const max = field.maxPerPart;
    const text = list[i] ?? "";
    if (max === undefined) return;
    const pieces = splitIntoParts(text, max, field.countRule);
    if (pieces.length < 2) return;
    onChange([...list.slice(0, i), ...pieces, ...list.slice(i + 1)]);
  };

  return (
    <div className="flex flex-col gap-2">
      {list.map((part, i) => {
        const count = countChars(part, field.countRule);
        const over = field.maxPerPart !== undefined && count > field.maxPerPart;
        const n = i + 1;
        return (
          <div
            // Parts are plain strings with no stable identity, so the index is the key.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            key={i}
            data-testid="part"
            data-over={over}
            className={`flex flex-col gap-2 rounded-card border bg-surface p-3 ${
              over ? "border-border-strong" : "border-border-input"
            }`}
          >
            <Textarea
              aria-label={t("editor.partLabel", { label, n })}
              minRows={3}
              className="border-0 bg-transparent px-0"
              value={part}
              onChange={(e) => set(i, e.target.value)}
            />
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-3">
                {field.maxParts !== undefined ? `${n}/${field.maxParts}` : n}
              </span>
              <span className="flex-1" />
              <Counter count={count} max={field.maxPerPart} />
              {field.maxPerPart !== undefined ? (
                <Button
                  variant="icon"
                  aria-label={t("editor.splitPart", { n })}
                  disabled={!over}
                  onClick={() => split(i)}
                >
                  <Scissors size={14} strokeWidth={1.7} />
                </Button>
              ) : null}
              <Button
                variant="icon"
                aria-label={t("editor.copyPart", { n })}
                disabled={part === ""}
                onClick={() => void platform.clipboard.writeText(part)}
              >
                <Copy size={14} strokeWidth={1.7} />
              </Button>
              <Button
                variant="icon"
                aria-label={t("editor.moveUp", { n })}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={14} strokeWidth={1.7} />
              </Button>
              <Button
                variant="icon"
                aria-label={t("editor.moveDown", { n })}
                disabled={i === list.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={14} strokeWidth={1.7} />
              </Button>
              <Button
                variant="icon"
                aria-label={t("editor.removePart", { n })}
                disabled={list.length === 1}
                onClick={() => onChange(list.filter((_, j) => j !== i))}
              >
                <X size={14} strokeWidth={1.7} />
              </Button>
            </div>
          </div>
        );
      })}
      <div>
        <Button disabled={atMax} onClick={() => onChange([...list, ""])}>
          <Plus size={14} strokeWidth={1.7} />
          {t("editor.addPart")}
        </Button>
      </div>
    </div>
  );
}

function Outline({
  label,
  items,
  onChange,
}: {
  label: string;
  items: OutlineItem[];
  onChange: (v: OutlineItem[]) => void;
}) {
  const { t } = useTranslation();
  const patch = (i: number, p: Partial<OutlineItem>) =>
    onChange(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: outline rows have no id
        <div key={i} className="flex items-center gap-2">
          <Input
            aria-label={t("editor.timestamp", { n: i + 1 })}
            className="w-20 shrink-0"
            placeholder="0:00"
            value={item.timestamp ?? ""}
            onChange={(e) => {
              const { timestamp: _drop, ...rest } = item;
              onChange(
                items.map((it, j) =>
                  j === i
                    ? e.target.value === ""
                      ? rest
                      : { ...rest, timestamp: e.target.value }
                    : it,
                ),
              );
            }}
          />
          <Input
            aria-label={t("editor.outlineRow", { label, n: i + 1 })}
            value={item.text}
            onChange={(e) => patch(i, { text: e.target.value })}
          />
          <Button
            variant="icon"
            aria-label={t("editor.removeRow", { n: i + 1 })}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <X size={14} strokeWidth={1.7} />
          </Button>
        </div>
      ))}
      <div>
        <Button onClick={() => onChange([...items, { text: "" }])}>
          <Plus size={14} strokeWidth={1.7} />
          {t("editor.addRow")}
        </Button>
      </div>
    </div>
  );
}
