import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Select, Textarea } from "../../components";
import { type AiCommand, type AiCommandInput, validateCommand } from "../../core/commands";
import { createCommandsRepository } from "../../db/repositories/commands";
import { platform } from "../../platform";

interface TypeOption {
  id: string;
  label: string;
}

const EMPTY: AiCommandInput = { name: "", prompt: "", contentTypeId: null, returnsOptions: false };

export function CommandsSettings() {
  const { t } = useTranslation();
  const repo = useMemo(() => createCommandsRepository(platform.database), []);
  const [commands, setCommands] = useState<AiCommand[]>([]);
  const [types, setTypes] = useState<TypeOption[]>([]);
  // `null` = closed, "new" = adding, otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<AiCommandInput>(EMPTY);

  const reload = useCallback(async () => {
    const [list, rows] = await Promise.all([
      repo.list(),
      platform.database.select<{ id: string; platform: string; name: string }>(
        "SELECT c.id, p.name AS platform, c.name FROM content_types c JOIN platforms p ON p.id = c.platform_id ORDER BY p.sort_order, c.sort_order",
      ),
    ]);
    setCommands(list);
    setTypes(rows.map((r) => ({ id: r.id, label: `${r.platform} · ${r.name}` })));
  }, [repo]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const targetLabel = (c: AiCommand) =>
    c.contentTypeId === null
      ? t("settings.commands.allTypes")
      : (types.find((x) => x.id === c.contentTypeId)?.label ?? "");

  const open = (c: AiCommand | null) => {
    setEditing(c ? c.id : "new");
    setDraft(
      c
        ? {
            name: c.name,
            prompt: c.prompt,
            contentTypeId: c.contentTypeId,
            returnsOptions: c.returnsOptions,
          }
        : EMPTY,
    );
  };
  const save = async () => {
    if (validateCommand(draft) || !editing) return;
    if (editing === "new") await repo.create(draft);
    else await repo.update(editing, draft);
    setEditing(null);
    await reload();
  };
  const remove = async (c: AiCommand) => {
    await repo.remove(c.id);
    if (editing === c.id) setEditing(null);
    await reload();
  };

  return (
    <section className="flex max-w-xl flex-col gap-3" aria-label={t("settings.commands.title")}>
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium">{t("settings.commands.title")}</h2>
        <Button variant="secondary" onClick={() => open(null)}>
          <Plus size={14} strokeWidth={1.7} />
          {t("settings.commands.add")}
        </Button>
      </div>
      <ul className="flex flex-col gap-1">
        {commands.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-2 rounded-row border border-border-input px-3 py-2"
          >
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => open(c)}>
              <span className="block text-[13px] text-text">{c.name}</span>
              <span className="block truncate text-xs text-text-3">{c.prompt}</span>
            </button>
            <span className="shrink-0 text-xs text-text-4">{targetLabel(c)}</span>
            <Button
              variant="icon"
              className="size-7"
              aria-label={t("settings.commands.delete", { name: c.name })}
              onClick={() => void remove(c)}
            >
              <Trash2 size={14} strokeWidth={1.7} />
            </Button>
          </li>
        ))}
      </ul>
      {editing ? (
        <form
          className="flex flex-col gap-3 rounded-row border border-border-strong p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="flex flex-col gap-1 text-[13px]">
            <label htmlFor="cmd-name">{t("settings.commands.name")}</label>
            <Input
              id="cmd-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 text-[13px]">
            <label htmlFor="cmd-prompt">{t("settings.commands.prompt")}</label>
            <Textarea
              id="cmd-prompt"
              value={draft.prompt}
              onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 text-[13px]">
            <label htmlFor="cmd-target">{t("settings.commands.target")}</label>
            <Select
              id="cmd-target"
              value={draft.contentTypeId ?? ""}
              onValueChange={(v) => setDraft({ ...draft, contentTypeId: v || null })}
            >
              <option value="">{t("settings.commands.allTypes")}</option>
              {types.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={draft.returnsOptions}
              onChange={(e) => setDraft({ ...draft, returnsOptions: e.target.checked })}
            />
            {t("settings.commands.returnsOptions")}
          </label>
          <div className="flex gap-2">
            <Button variant="primary" type="submit" disabled={validateCommand(draft) !== null}>
              {t("settings.commands.save")}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t("settings.commands.cancel")}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
