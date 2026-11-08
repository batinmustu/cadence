import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Select } from "../../components";
import type { FieldDef, FieldKind, FieldSchema } from "../../core/fieldSchema";
import { COUNT_RULES, checkSchema, newField } from "../../core/platforms";

const KINDS: FieldKind[] = ["text", "longtext", "parts", "outline", "checklist"];

interface Props {
  initialName: string;
  initialSchema: FieldSchema;
  onSave: (name: string, schema: FieldSchema) => Promise<void>;
  onCancel: () => void;
}

const num = (raw: string): number | undefined => {
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? undefined : n;
};

/** Sets or clears one optional numeric limit without leaving `undefined` keys behind. */
function withLimit(f: FieldDef, key: "max" | "maxPerPart" | "maxParts", value: number | undefined) {
  const copy: Record<string, unknown> = { ...f };
  if (value === undefined) delete copy[key];
  else copy[key] = value;
  return copy as unknown as FieldDef;
}

export function ContentTypeEditor({ initialName, initialSchema, onSave, onCancel }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [fields, setFields] = useState<FieldDef[]>(initialSchema.fields);
  const [kind, setKind] = useState<FieldKind>("text");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (i: number, next: FieldDef) =>
    setFields((cur) => cur.map((f, idx) => (idx === i ? next : f)));
  const label = (f: FieldDef) => f.label ?? f.key;

  const save = async () => {
    if (name.trim() === "") return setError(t("settings.platforms.errors.name"));
    const checked = checkSchema(fields);
    if (!checked.ok) return setError(`${t("settings.platforms.errors.schema")} ${checked.error}`);
    setError(null);
    setSaving(true);
    try {
      await onSave(name, checked.schema);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-3 rounded-card bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex flex-col gap-1 text-xs text-text-3">
        {t("settings.platforms.typeName")}
        <Input
          aria-label={t("settings.platforms.typeName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {fields.map((f, i) => (
          <li
            key={f.key}
            className="flex flex-col gap-2 rounded-row border border-border-input p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                aria-label={t("settings.platforms.fieldLabel", { n: i + 1 })}
                value={label(f)}
                onChange={(e) => update(i, { ...f, label: e.target.value })}
              />
              <span className="shrink-0 text-xs text-text-3">
                {t(`settings.platforms.kinds.${f.kind}`)}
              </span>
              <Button
                variant="icon"
                aria-label={t("settings.platforms.removeField", { n: i + 1 })}
                onClick={() => setFields((cur) => cur.filter((_, idx) => idx !== i))}
              >
                <Trash2 size={14} strokeWidth={1.7} />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-3">
              {f.kind === "text" || f.kind === "longtext" ? (
                <div className="flex items-center gap-1">
                  {t("settings.platforms.max")}
                  <Input
                    className="w-24"
                    inputMode="numeric"
                    aria-label={t("settings.platforms.maxOf", { n: i + 1 })}
                    value={f.max ?? ""}
                    onChange={(e) => update(i, withLimit(f, "max", num(e.target.value)))}
                  />
                </div>
              ) : null}
              {f.kind === "parts" ? (
                <>
                  <div className="flex items-center gap-1">
                    {t("settings.platforms.maxPerPart")}
                    <Input
                      className="w-24"
                      inputMode="numeric"
                      aria-label={t("settings.platforms.maxPerPartOf", { n: i + 1 })}
                      value={f.maxPerPart ?? ""}
                      onChange={(e) => update(i, withLimit(f, "maxPerPart", num(e.target.value)))}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {t("settings.platforms.maxParts")}
                    <Input
                      className="w-24"
                      inputMode="numeric"
                      aria-label={t("settings.platforms.maxPartsOf", { n: i + 1 })}
                      value={f.maxParts ?? ""}
                      onChange={(e) => update(i, withLimit(f, "maxParts", num(e.target.value)))}
                    />
                  </div>
                </>
              ) : null}
              {f.kind === "text" || f.kind === "longtext" || f.kind === "parts" ? (
                <div className="flex items-center gap-1">
                  {t("settings.platforms.countRule")}
                  <Select
                    className="h-8 w-40"
                    aria-label={t("settings.platforms.countRuleOf", { n: i + 1 })}
                    value={f.countRule ?? "plain"}
                    onChange={(e) => update(i, { ...f, countRule: e.target.value })}
                  >
                    {COUNT_RULES.map((r) => (
                      <option key={r} value={r}>
                        {t(`settings.platforms.rules.${r}`)}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              {f.kind === "checklist" ? (
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  {t("settings.platforms.items")}
                  <Input
                    aria-label={t("settings.platforms.itemsOf", { n: i + 1 })}
                    value={f.items.join(", ")}
                    onChange={(e) => update(i, { ...f, items: e.target.value.split(",") })}
                  />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <Select
          className="w-40"
          aria-label={t("settings.platforms.newFieldKind")}
          value={kind}
          onChange={(e) => setKind(e.target.value as FieldKind)}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`settings.platforms.kinds.${k}`)}
            </option>
          ))}
        </Select>
        <Button
          onClick={() =>
            setFields((cur) =>
              cur.concat(
                newField(
                  kind,
                  t(`settings.platforms.kinds.${kind}`),
                  cur.map((f) => f.key),
                ),
              ),
            )
          }
        >
          <Plus size={14} strokeWidth={1.7} />
          {t("settings.platforms.addField")}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-[13px] text-text-2">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>{t("settings.commands.cancel")}</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {t("settings.commands.save")}
        </Button>
      </div>
    </form>
  );
}
