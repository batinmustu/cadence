import { Link } from "@tanstack/react-router";
import { Copy, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ConfirmDialog, Select } from "../../components";
import { ICON_STROKE, iconSize } from "../../components/iconSize";
import { parseFieldSchema } from "../../core/fieldSchema";
import { parseFields } from "../../core/posts";
import { groupByMonth, type PublishedItem } from "../../core/published";
import { variantText } from "../../core/schedule";
import { createPlatformsRepository } from "../../db/repositories/platforms";
import { createPostsRepository } from "../../db/repositories/posts";
import { listPublished } from "../../db/repositories/published";
import { createSeriesRepository } from "../../db/repositories/series";
import { platform } from "../../platform";
import { notifySeriesChanged } from "../series/seriesEvents";

const PAGE_SIZE = 100;

interface Option {
  id: string;
  name: string;
}

export function PublishedScreen() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<PublishedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [platformId, setPlatformId] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [platforms, setPlatforms] = useState<Option[]>([]);
  const [series, setSeries] = useState<Option[]>([]);
  const [ready, setReady] = useState(false);
  const [deleting, setDeleting] = useState<PublishedItem | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const posts = useMemo(() => createPostsRepository(platform.database), []);

  const load = useCallback(async () => {
    const [list, plats, all] = await Promise.all([
      listPublished(platform.database, {
        platformId,
        seriesId,
        limit,
      }),
      createPlatformsRepository(platform.database).listVisible(),
      createSeriesRepository(platform.database).list(),
    ]);
    setItems(list.items);
    setTotal(list.total);
    setPlatforms(plats);
    setSeries(all.map((s) => ({ id: s.id, name: s.name })));
    setReady(true);
  }, [platformId, seriesId, limit]);

  useEffect(() => {
    load().catch(() => setReady(true));
  }, [load]);

  const months = groupByMonth(items);
  const monthFmt = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" });
  const dayFmt = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });
  const filtered = platformId !== "" || seriesId !== "";

  const copy = async (item: PublishedItem) => {
    const schema = parseFieldSchema(item.fieldSchema);
    const text = variantText(schema.ok ? schema.value : { fields: [] }, parseFields(item.fields));
    await platform.clipboard.writeText(text || item.title);
    setCopied(item.postId);
    setTimeout(() => setCopied(null), 1500);
  };
  const unpublish = async (item: PublishedItem) => {
    await posts.update(item.postId, { status: "draft", publishedAt: null });
    notifySeriesChanged();
    await load();
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          {t("nav.published")} <span className="text-sm text-text-3">{total}</span>
        </h1>
        <div className="flex items-center gap-2">
          <Select
            aria-label={t("ideas.filterBy.platform")}
            className="h-8 w-36"
            value={platformId}
            onValueChange={(v) => {
              setPlatformId(v);
              setLimit(PAGE_SIZE);
            }}
          >
            <option value="">{t("ideas.filterBy.allPlatforms")}</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          {series.length > 0 ? (
            <Select
              aria-label={t("ideas.filterBy.series")}
              className="h-8 w-36"
              value={seriesId}
              onValueChange={(v) => {
                setSeriesId(v);
                setLimit(PAGE_SIZE);
              }}
            >
              <option value="">{t("ideas.filterBy.allSeries")}</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>

      {ready && items.length === 0 ? (
        <p className="mt-8 text-text-3">{filtered ? t("ideas.noMatches") : t("published.empty")}</p>
      ) : null}

      {months.map((m) => (
        <div key={m.month} className="mt-8" data-testid={`month-${m.month}`}>
          <h2 className="mb-2 text-xs font-medium uppercase text-text-3">
            {monthFmt.format(new Date(`${m.month}-15T12:00:00`))}
          </h2>
          <ul className="m-0 list-none p-0">
            {m.items.map((item) => (
              <li
                key={item.postId}
                className="group flex items-center gap-3 rounded-row px-2 py-2 hover:bg-surface"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to="/ideas/$id"
                    params={{ id: item.ideaId }}
                    className="block truncate font-medium text-text no-underline"
                  >
                    {item.title}
                  </Link>
                  <div className="truncate text-xs text-text-3">
                    {item.platformName}
                    {item.seriesName ? ` · ${item.seriesName}` : ""}
                  </div>
                </div>
                <span className="text-xs text-text-3">
                  {dayFmt.format(new Date(item.publishedAt))}
                </span>
                <div className="flex gap-1 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
                  <Button
                    variant="icon"
                    aria-label={t("published.copy", { title: item.title })}
                    onClick={() => void copy(item)}
                  >
                    <Copy size={iconSize.inline} strokeWidth={ICON_STROKE} />
                  </Button>
                  <Button
                    variant="icon"
                    aria-label={t("published.unpublish", { title: item.title })}
                    onClick={() => void unpublish(item)}
                  >
                    <RotateCcw size={iconSize.inline} strokeWidth={ICON_STROKE} />
                  </Button>
                  <Button
                    variant="icon"
                    aria-label={t("published.delete", { title: item.title })}
                    onClick={() => setDeleting(item)}
                  >
                    <Trash2 size={iconSize.inline} strokeWidth={ICON_STROKE} />
                  </Button>
                </div>
                {copied === item.postId ? (
                  <span role="status" className="text-xs text-text-3">
                    {t("editor.copied")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {items.length < total ? (
        <div className="mt-6 flex justify-center">
          <Button onClick={() => setLimit((n) => n + PAGE_SIZE)}>
            {t("ideas.showMore", { shown: items.length, total })}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("delete.variant.title", { name: deleting?.title ?? "" })}
        description={t("delete.variant.body")}
        onConfirm={async () => {
          if (deleting) await posts.softDelete(deleting.postId);
          setDeleting(null);
          notifySeriesChanged();
          await load();
        }}
      />
    </section>
  );
}
