import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ConfirmDialog } from "../../components";
import { ICON_STROKE, iconSize } from "../../components/iconSize";
import type { Tag } from "../../core/tags";
import { createTagsRepository } from "../../db/repositories/tags";
import { platform } from "../../platform";

/** Removing a tag here removes it from every idea. */
export function TagsSettings() {
  const { t } = useTranslation();
  const repo = useMemo(() => createTagsRepository(platform.database), []);
  const [tags, setTags] = useState<Tag[]>([]);
  const [deleting, setDeleting] = useState<Tag | null>(null);
  const load = useCallback(
    () =>
      void repo
        .list()
        .then(setTags)
        .catch(() => {}),
    [repo],
  );
  useEffect(load, [load]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{t("settings.nav.tags")}</h2>
      <p className="text-[13px] text-text-3">{t("settings.tags.body")}</p>
      {tags.length === 0 ? <p className="text-text-3">{t("settings.tags.empty")}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {tags.map((tag) => (
          <li
            key={tag.id}
            className="flex items-center justify-between rounded-row px-2 py-1 hover:bg-surface"
          >
            <span>#{tag.name}</span>
            <Button
              variant="icon"
              aria-label={t("delete.tag.action", { name: tag.name })}
              onClick={() => setDeleting(tag)}
            >
              <Trash2 size={iconSize.inline} strokeWidth={ICON_STROKE} />
            </Button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("delete.tag.title", { name: deleting?.name ?? "" })}
        description={t("delete.tag.body")}
        onConfirm={async () => {
          if (deleting) await repo.remove(deleting.id);
          setDeleting(null);
          load();
        }}
      />
    </section>
  );
}
