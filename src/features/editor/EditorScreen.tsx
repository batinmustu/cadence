import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Select, TagInput } from "../../components";
import { applyResult } from "../../core/assist";
import { AssistantPanel } from "../assistant/AssistantPanel";
import { FieldRenderer } from "./FieldRenderer";
import { PostActions } from "./PostActions";
import { useEditor } from "./useEditor";

export function EditorScreen({ ideaId }: { ideaId: string }) {
  const { t } = useTranslation();
  const {
    idea,
    tags,
    addTag,
    removeTag,
    variants,
    contentTypes,
    hiddenPlatformIds,
    loaded,
    saveState,
    setTitle,
    setField,
    updateVariant,
    setArchived,
    addVariant,
  } = useEditor(ideaId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  if (!loaded) return null;
  if (!idea) {
    return (
      <section>
        <Link to="/ideas" className="text-text-3">
          {t("editor.back")}
        </Link>
        <p className="mt-4 text-text-3">{t("editor.notFound")}</p>
      </section>
    );
  }

  const active = variants.find((v) => v.id === activeId) ?? variants[0] ?? null;
  const activeSchema = contentTypes.find((c) => c.id === active?.contentTypeId)?.schema ?? {
    fields: [],
  };
  const typeName = (id: string) => {
    const c = contentTypes.find((x) => x.id === id);
    return c ? `${c.platformName} · ${c.name}` : id;
  };

  const activeType = contentTypes.find((c) => c.id === active?.contentTypeId);

  return (
    <div className="flex gap-8">
      <section className="min-w-0 flex-1">
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
              onValueChange={(v) => void setArchived(v === "archived")}
            >
              <option value="active">
                {t(`ideas.status.${idea.status === "archived" ? "idea" : idea.status}`)}
              </option>
              <option value="archived">{t("ideas.status.archived")}</option>
            </Select>
          </div>
        </header>

        <div className="mt-3 pl-11">
          <TagInput
            selected={idea.tagIds.flatMap((id) => tags.find((x) => x.id === id) ?? [])}
            known={tags}
            onAdd={(name) => void addTag(name)}
            onRemove={(tag) => void removeTag(tag.id)}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {variants.map((v) => (
            <Button
              key={v.id}
              variant={v.id === active?.id ? "primary" : "secondary"}
              aria-pressed={v.id === active?.id}
              className="motion-colors"
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
            {contentTypes
              .filter((c) => !hiddenPlatformIds.includes(c.platformId))
              .map((c) => (
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
            <div key={active.id} className="motion-fade-in">
              <FieldRenderer
                schema={activeSchema}
                values={active.fields}
                onChange={(key, value) => setField(active.id, key, value)}
              />
              <PostActions
                key={`${active.id}:${active.updatedAt}`}
                post={active}
                schema={activeSchema}
                onUpdate={(patch) => updateVariant(active.id, patch)}
              />
            </div>
          ) : (
            <p className="text-text-3">{t("editor.noVariants")}</p>
          )}
        </div>
      </section>
      {active ? (
        <AssistantPanel
          contentTypeId={active.contentTypeId}
          contentTypeName={activeType?.name}
          schema={activeSchema}
          values={active.fields}
          onApply={(mode, text) => {
            const patch = applyResult(activeSchema, active.fields, mode, text);
            if (patch) setField(active.id, patch.key, patch.value);
          }}
        />
      ) : null}
    </div>
  );
}
