import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Lightbulb, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, ConfirmDialog, Input, Segmented, Select } from "../../components";
import { ICON_STROKE, iconSize } from "../../components/iconSize";
import {
  countByFilter,
  DEFAULT_IDEA_QUERY,
  hasActiveFilters,
  type IdeaFilterKey,
  type IdeaGroupBy,
  type IdeaQuery,
  type IdeaSort,
  type IdeaStatus,
  queryIdeas,
  sectionIdeas,
} from "../../core/ideas";
import { CaptureBox } from "./CaptureBox";
import { type IdeasSearch, queryToSearch, searchToQuery } from "./ideasSearch";
import { useIdeas } from "./useIdeas";

const FILTERS: IdeaFilterKey[] = ["all", "draft", "planned", "published"];
const SORTS: IdeaSort[] = ["newest", "oldest", "planned"];
const GROUPS: IdeaGroupBy[] = ["date", "series", "status"];
/** Rows rendered at once; "Show more" adds another page, so 2,000+ ideas stay smooth. */
const PAGE_SIZE = 100;

export function IdeasScreen() {
  const { t, i18n } = useTranslation();
  const { ideas, platforms, tags, series, plannedAt, ready, capture, remove } = useIdeas();
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as IdeasSearch;
  const query = searchToQuery(search);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE_SIZE);

  const setQuery = (patch: Partial<IdeaQuery>) => {
    setLimit(PAGE_SIZE);
    void navigate({ to: "/ideas", search: queryToSearch({ ...query, ...patch }), replace: true });
  };
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const visible = useMemo(() => queryIdeas(ideas, query, plannedAt), [ideas, query, plannedAt]);
  const counts = useMemo(() => countByFilter(ideas, query), [ideas, query]);
  const sections = useMemo(() => sectionIdeas(visible, query.groupBy), [visible, query.groupBy]);
  // Only the first `limit` ideas of expanded sections are rendered; collapsed ones render none.
  let budget = limit;
  const groups = sections.map((sec) => {
    const shown = collapsed.has(sec.key) ? [] : sec.ideas.slice(0, Math.max(budget, 0));
    budget -= shown.length;
    return { ...sec, shown, total: sec.ideas.length };
  });
  const renderedCount = groups.reduce((n, g) => n + g.shown.length, 0);
  const expandedTotal = sections.reduce(
    (n, x) => n + (collapsed.has(x.key) ? 0 : x.ideas.length),
    0,
  );
  const groupLabel = (key: string): string => {
    if (query.groupBy === "date") return t(`ideas.group.${key}`);
    if (query.groupBy === "status") return statusLabel(key as IdeaStatus, t);
    return series.find((x) => x.id === key)?.name ?? t("ideas.noSeriesGroup");
  };
  const fmt = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" });

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("nav.ideas")}</h1>
        <Segmented
          label={t("ideas.filter.label")}
          value={query.status}
          onChange={(v) => setQuery({ status: v })}
          options={FILTERS.map((f) => ({
            value: f,
            label: `${t(`ideas.filter.${f}`)} ${counts[f]}`,
          }))}
        />
      </div>
      <div className="mt-6">
        <CaptureBox
          platforms={platforms}
          tags={tags}
          series={series}
          onCapture={capture}
          autoFocus={ready && ideas.length === 0}
        />
      </div>
      {ideas.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2" data-testid="ideas-filters">
          <Input
            type="search"
            aria-label={t("ideas.filters.search")}
            placeholder={t("ideas.filters.searchPlaceholder")}
            className="h-8 w-48"
            value={query.text}
            onChange={(e) => setQuery({ text: e.target.value })}
          />
          <Select
            aria-label={t("ideas.filters.platform")}
            className="h-8 w-40"
            value={query.platformId}
            onValueChange={(v) => setQuery({ platformId: v })}
          >
            <option value="">{t("ideas.filters.allPlatforms")}</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          {series.length > 0 ? (
            <Select
              aria-label={t("ideas.filters.series")}
              className="h-8 w-40"
              value={query.seriesId}
              onValueChange={(v) => setQuery({ seriesId: v })}
            >
              <option value="">{t("ideas.filters.allSeries")}</option>
              {series.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          ) : null}
          {tags.length > 0 ? (
            <Select
              aria-label={t("tags.filter")}
              className="h-8 w-40"
              value={query.tagId}
              onValueChange={(v) => setQuery({ tagId: v })}
            >
              <option value="">{t("tags.allTags")}</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  #{tag.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Select
            aria-label={t("ideas.sort.label")}
            className="h-8 w-40"
            value={query.sort}
            onValueChange={(v) => setQuery({ sort: v as IdeaSort })}
          >
            {SORTS.map((x) => (
              <option key={x} value={x}>
                {t(`ideas.sort.${x}`)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t("ideas.groupBy.label")}
            className="h-8 w-36"
            value={query.groupBy}
            onValueChange={(v) => setQuery({ groupBy: v as IdeaGroupBy })}
          >
            {GROUPS.map((x) => (
              <option key={x} value={x}>
                {t("ideas.groupBy.label")}: {t(`ideas.groupBy.${x}`)}
              </option>
            ))}
          </Select>
          {hasActiveFilters(query) ? (
            <Button
              variant="ghost"
              onClick={() => {
                setLimit(PAGE_SIZE);
                void navigate({
                  to: "/ideas",
                  search: queryToSearch({
                    ...DEFAULT_IDEA_QUERY,
                    sort: query.sort,
                    groupBy: query.groupBy,
                  }),
                  replace: true,
                });
              }}
            >
              {t("ideas.filters.clear")}
            </Button>
          ) : null}
        </div>
      ) : null}
      {ideas.length > 0 && visible.length === 0 ? (
        <p className="mt-8 text-text-3">{t("ideas.noMatches")}</p>
      ) : null}
      {ready && ideas.length === 0 ? <p className="mt-8 text-text-3">{t("ideas.empty")}</p> : null}
      {groups.map((g) => (
        <div key={g.key} className="mt-8" data-testid={`group-${g.key || "none"}`}>
          <h2 className="mb-2 text-xs font-medium uppercase text-text-3">
            <button
              type="button"
              className="flex items-center gap-1 uppercase"
              aria-expanded={!collapsed.has(g.key)}
              aria-label={`${collapsed.has(g.key) ? t("ideas.expand") : t("ideas.collapse")}: ${groupLabel(g.key)}`}
              onClick={() => toggleGroup(g.key)}
            >
              {collapsed.has(g.key) ? (
                <ChevronRight size={iconSize.tiny} />
              ) : (
                <ChevronDown size={iconSize.tiny} />
              )}
              {groupLabel(g.key)} · {g.total}
            </button>
          </h2>
          <ul className="m-0 list-none p-0">
            {g.shown.map((idea) => {
              const planned = plannedAt[idea.id];
              const published = idea.status === "published";
              return (
                <li
                  key={idea.id}
                  className={`group flex items-center gap-3 rounded-row px-2 py-2 hover:bg-surface ${published ? "opacity-60" : ""}`}
                  onKeyDown={(e) => {
                    // Delete or ⌘⌫ on a focused row asks to delete it.
                    if (
                      e.target === e.currentTarget.querySelector("a") ||
                      e.target === e.currentTarget
                    ) {
                      if (e.key === "Delete" || (e.key === "Backspace" && e.metaKey)) {
                        e.preventDefault();
                        setDeleting({ id: idea.id, title: idea.title });
                      }
                    }
                  }}
                >
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-row bg-surface-2 text-text-2">
                    <Lightbulb size={iconSize.action} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/ideas/$id"
                      params={{ id: idea.id }}
                      className="block truncate font-medium text-text no-underline"
                    >
                      {idea.title}
                    </Link>
                    {idea.tagIds.length > 0 ? (
                      <div className="truncate text-xs text-text-3">
                        {idea.tagIds
                          .map((id) => tags.find((x) => x.id === id))
                          .flatMap((x) => (x ? [`#${x.name}`] : []))
                          .join(" ")}
                      </div>
                    ) : null}
                    {idea.note ? (
                      <div className="truncate text-sm text-text-3">{idea.note}</div>
                    ) : null}
                  </div>
                  {idea.status === "planned" && planned ? (
                    <Badge variant="outline">{fmt.format(new Date(planned))}</Badge>
                  ) : null}
                  <Badge>{statusLabel(idea.status, t)}</Badge>
                  <Button
                    variant="icon"
                    aria-label={t("delete.idea.action", { title: idea.title })}
                    className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={() => setDeleting({ id: idea.id, title: idea.title })}
                  >
                    <Trash2 size={iconSize.inline} strokeWidth={ICON_STROKE} />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {renderedCount < expandedTotal ? (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-text-3">
          {t("ideas.showing", { shown: renderedCount, total: expandedTotal })}
          <Button variant="ghost" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
            {t("ideas.loadMore")}
          </Button>
        </div>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("delete.idea.title", { title: deleting?.title ?? "" })}
        description={t("delete.idea.body")}
        onConfirm={async () => {
          if (deleting) await remove(deleting.id);
          setDeleting(null);
        }}
      />
    </section>
  );
}

function statusLabel(status: IdeaStatus, t: (k: string) => string): string {
  return status === "published" ? t("ideas.publishedMark") : t(`ideas.status.${status}`);
}
