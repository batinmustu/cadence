import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input } from "../../components";
import { ICON_STROKE, iconSize } from "../../components/iconSize";
import { moveId } from "../../core/platforms";
import {
  type ContentTypeRow,
  createPlatformsRepository,
  type PlatformRow,
} from "../../db/repositories/platforms";
import { platform } from "../../platform";
import { ContentTypeEditor } from "./ContentTypeEditor";

export function PlatformsSettings() {
  const { t } = useTranslation();
  const repo = useMemo(() => createPlatformsRepository(platform.database), []);
  const [platforms, setPlatforms] = useState<PlatformRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [types, setTypes] = useState<ContentTypeRow[]>([]);
  // `null` = closed, "new" = adding, otherwise the content type id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const list = await repo.list();
    setPlatforms(list);
    setSelected((cur) => (cur && list.some((p) => p.id === cur) ? cur : (list[0]?.id ?? null)));
  }, [repo]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    if (selected) void repo.listContentTypes(selected).then(setTypes);
    else setTypes([]);
  }, [repo, selected]);

  const refreshTypes = async () => {
    if (selected) setTypes(await repo.listContentTypes(selected));
  };
  const report = (r: "removed" | "preset" | "inUse") => {
    setNotice(r === "removed" ? null : t(`settings.platforms.${r}`));
  };
  const current = platforms.find((p) => p.id === selected) ?? null;
  const editingType = types.find((c) => c.id === editing);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-text-3">
          {t("settings.nav.platforms")}
        </h2>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {platforms.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-1 rounded-row px-2 py-1 ${
                p.id === selected ? "bg-surface-2" : ""
              }`}
            >
              <Input
                aria-label={t("settings.platforms.name", { name: p.name })}
                defaultValue={p.name}
                key={`${p.id}:${p.name}`}
                className={p.hidden ? "opacity-50" : ""}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== p.name) void repo.rename(p.id, v).then(reload);
                  else e.target.value = p.name;
                }}
              />
              <Button
                onClick={() => {
                  setSelected(p.id);
                  setEditing(null);
                }}
              >
                {t("settings.platforms.types")}
              </Button>
              <Button
                variant="icon"
                aria-label={t("settings.platforms.moveUp", { name: p.name })}
                onClick={() =>
                  void repo
                    .reorder(
                      moveId(
                        platforms.map((x) => x.id),
                        p.id,
                        -1,
                      ),
                    )
                    .then(reload)
                }
              >
                <ArrowUp size={iconSize.inline} strokeWidth={ICON_STROKE} />
              </Button>
              <Button
                variant="icon"
                aria-label={t("settings.platforms.moveDown", { name: p.name })}
                onClick={() =>
                  void repo
                    .reorder(
                      moveId(
                        platforms.map((x) => x.id),
                        p.id,
                        1,
                      ),
                    )
                    .then(reload)
                }
              >
                <ArrowDown size={iconSize.inline} strokeWidth={ICON_STROKE} />
              </Button>
              <Button
                variant="icon"
                aria-pressed={p.hidden}
                aria-label={t(p.hidden ? "settings.platforms.show" : "settings.platforms.hide", {
                  name: p.name,
                })}
                onClick={() => void repo.setHidden(p.id, !p.hidden).then(reload)}
              >
                {p.hidden ? (
                  <EyeOff size={iconSize.inline} strokeWidth={ICON_STROKE} />
                ) : (
                  <Eye size={iconSize.inline} strokeWidth={ICON_STROKE} />
                )}
              </Button>
              {p.isPreset ? null : (
                <Button
                  variant="icon"
                  aria-label={t("settings.platforms.delete", { name: p.name })}
                  onClick={() =>
                    void repo.remove(p.id).then(async (r) => {
                      report(r);
                      await reload();
                    })
                  }
                >
                  <Trash2 size={iconSize.inline} strokeWidth={ICON_STROKE} />
                </Button>
              )}
            </li>
          ))}
        </ul>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            void repo.create(newName).then(async (p) => {
              setNewName("");
              setSelected(p.id);
              await reload();
            });
          }}
        >
          <Input
            aria-label={t("settings.platforms.newName")}
            placeholder={t("settings.platforms.newName")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" disabled={!newName.trim()}>
            <Plus size={iconSize.inline} strokeWidth={ICON_STROKE} />
            {t("settings.commands.add")}
          </Button>
        </form>
        {notice ? (
          <p role="status" className="text-[13px] text-text-2">
            {notice}
          </p>
        ) : null}
      </section>

      {current ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-text-3">
            {t("settings.platforms.typesOf", { name: current.name })}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {types.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-row bg-surface px-3 py-1.5">
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <Button onClick={() => setEditing(c.id)}>{t("settings.platforms.edit")}</Button>
                {c.isPreset ? null : (
                  <Button
                    variant="icon"
                    aria-label={t("settings.platforms.deleteType", { name: c.name })}
                    onClick={() =>
                      void repo.removeContentType(c.id).then(async (r) => {
                        report(r);
                        await refreshTypes();
                      })
                    }
                  >
                    <Trash2 size={iconSize.inline} strokeWidth={ICON_STROKE} />
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {editing === null ? (
            <Button className="self-start" onClick={() => setEditing("new")}>
              <Plus size={iconSize.inline} strokeWidth={ICON_STROKE} />
              {t("settings.platforms.addType")}
            </Button>
          ) : (
            <ContentTypeEditor
              key={editing}
              initialName={editingType?.name ?? ""}
              initialSchema={editingType?.schema ?? { fields: [] }}
              onCancel={() => setEditing(null)}
              onSave={async (name, schema) => {
                await repo.saveContentType({
                  ...(editingType ? { id: editingType.id } : {}),
                  platformId: current.id,
                  name,
                  schema,
                });
                setEditing(null);
                await refreshTypes();
              }}
            />
          )}
        </section>
      ) : null}
    </div>
  );
}
