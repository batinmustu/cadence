import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Select } from "../../components";
import { useEditor } from "./useEditor";

export function EditorScreen({ ideaId }: { ideaId: string }) {
  const { t } = useTranslation();
  const { idea, variants, contentTypes, loaded, saveState, setTitle, setArchived, addVariant } =
    useEditor(ideaId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  if (!loaded) return null;
  if (!idea) {
    return (
      <section className="mx-auto w-full max-w-3xl">
        <Link to="/ideas" className="text-text-3">
          {t("editor.back")}
        </Link>
        <p className="mt-4 text-text-3">{t("editor.notFound")}</p>
      </section>
    );
  }

  const active = variants.find((v) => v.id === activeId) ?? variants[0] ?? null;
  const typeName = (id: string) => {
    const c = contentTypes.find((x) => x.id === id);
    return c ? `${c.platformName} · ${c.name}` : id;
  };

  return (
    <section className="mx-auto w-full max-w-3xl">
      <header className="flex items-center gap-3">
        <Link
          to="/ideas"
          aria-label={t("editor.back")}
          className="flex size-8 items-center justify-center rounded-chip text-text-3 hover:bg-surface-2"
        >
          <ArrowLeft size={16} strokeWidth={1.7} />
        </Link>
        <input
          aria-label={t("editor.title")}
          value={idea.title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-xl font-semibold focus:outline-none"
        />
        <span className="text-xs text-text-3" role="status">
          {saveState === "saved" ? t("editor.saved") : t("editor.saving")}
        </span>
        <div className="w-32 shrink-0">
          <Select
            aria-label={t("editor.status")}
            className="h-8"
            value={idea.status === "archived" ? "archived" : "active"}
            onChange={(e) => void setArchived(e.target.value === "archived")}
          >
            <option value="active">
              {t(`ideas.status.${idea.status === "archived" ? "idea" : idea.status}`)}
            </option>
            <option value="archived">{t("ideas.status.archived")}</option>
          </Select>
        </div>
        {/* Scheduling arrives with issue #17. */}
        <Button variant="primary" disabled>
          {t("editor.schedule")}
        </Button>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {variants.map((v) => (
          <Button
            key={v.id}
            variant={v.id === active?.id ? "primary" : "secondary"}
            aria-pressed={v.id === active?.id}
            onClick={() => setActiveId(v.id)}
          >
            {typeName(v.contentTypeId)}
          </Button>
        ))}
        <Button
          variant="icon"
          aria-label={t("editor.addVariant")}
          aria-expanded={picking}
          onClick={() => setPicking((p) => !p)}
        >
          <Plus size={16} strokeWidth={1.7} />
        </Button>
      </div>

      {picking ? (
        <div className="mt-2 flex flex-col gap-1 rounded-card bg-surface p-2" role="menu">
          {contentTypes.map((c) => (
            <button
              key={c.id}
              type="button"
              role="menuitem"
              className="rounded-row px-3 py-1.5 text-left text-[13px] hover:bg-surface-2"
              onClick={async () => {
                const post = await addVariant(c.id);
                setActiveId(post.id);
                setPicking(false);
              }}
            >
              {c.platformName} · {c.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        {active ? (
          <p className="text-text-3">{t("editor.fieldsSoon")}</p>
        ) : (
          <p className="text-text-3">{t("editor.noVariants")}</p>
        )}
      </div>
    </section>
  );
}
