import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronDown, Lightbulb, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, ConfirmDialog, Input, Segmented, Select } from "../../components";
import { ICON_STROKE, iconSize } from "../../components/iconSize";
import {
  countIdeasByStatus,
  groupIdeasByDate,
  hasActiveFilters,
  IDEA_FILTER_KEYS,
  IDEA_SORTS,
  type IdeaQuery,
  type IdeaStatus,
  limitGroups,
  parseIdeaSearch,
  queryIdeas,
  serializeIdeaSearch,
} from "../../core/ideas";
import { CaptureBox } from "./CaptureBox";
import { useIdeas } from "./useIdeas";

const PAGE_SIZE = 100;

export function IdeasScreen() {
  const { t, i18n } = useTranslation();
  const { ideas, platforms, tags, series, plannedAt, ready, capture, remove } = useIdeas();
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  const navigate = useNavigate();
  const query = parseIdeaSearch(useSearch({ strict: false }) as Record<string, unknown>);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const update = (patch: Partial<IdeaQuery>) => {
    setLimit(PAGE_SIZE);
    void navigate({
      to: "/ideas",
      search: serializeIdeaSearch({ ...query, ...patch }),
      replace: true,
    });
  };

  const visible = queryIdeas(ideas, query, plannedAt);
  const counts = countIdeasByStatus(ideas, query);
  const groups = limitGroups(groupIdeasByDate(visible, new Date(), query.sort !== "newest"), limit);
  const shown = groups.reduce((n, g) => n + g.ideas.length, 0);
  const fmt = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" });

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("nav.ideas")}</h1>
        <Segmented
          label={t("ideas.filter.label")}
          value={query.status}
          onChange={(status) => update({ status })}
          options={IDEA_FILTER_KEYS.map((f) => ({
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
      <div className="mt-6 flex flex-wrap items-center gap-2" data-testid="idea-filters">
        <Input
          aria-label={t("ideas.search.label")}
          placeholder={t("ideas.search.placeholder")}
          className="h-8 w-48"
          value={query.text}
          onChange={(e) => update({ text: e.target.value })}
        />
        <Select
          aria-label={t("ideas.filterBy.platform")}
          className="h-8 w-36"
          value={query.platformId}
          onValueChange={(platformId) => update({ platformId })}
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
            value={query.seriesId}
            onValueChange={(seriesId) => update({ seriesId })}
          >
            <option value="">{t("ideas.filterBy.allSeries")}</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        ) : null}
        {tags.length > 0 ? (
          <Select
            aria-label={t("tags.filter")}
            className="h-8 w-36"
            value={query.tagId}
            onValueChange={(tagId) => update({ tagId })}
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
          className="h-8 w-36"
          value={query.sort}
          onValueChange={(sort) => update({ sort: sort as IdeaQuery["sort"] })}
        >
          {IDEA_SORTS.map((o) => (
            <option key={o} value={o}>
              {t(`ideas.sort.${o}`)}
            </option>
          ))}
        </Select>
        {hasActiveFilters(query) ? (
          <Button
            variant="ghost"
            onClick={() => update({ ...parseIdeaSearch({}), sort: query.sort })}
          >
            {t("ideas.clearFilters")}
          </Button>
        ) : null}
      </div>
      {ready && ideas.length > 0 && visible.length === 0 ? (
        <p className="mt-8 text-text-3">{t("ideas.noMatches")}</p>
      ) : null}
      {ready && ideas.length === 0 ? <p className="mt-8 text-text-3">{t("ideas.empty")}</p> : null}
      {groups.map((g) => (
        <div key={g.group} className="mt-8" data-testid={`group-${g.group}`}>
          <h2 className="mb-2 text-xs font-medium uppercase text-text-3">
            <button
              type="button"
              aria-expanded={!collapsed.has(g.group)}
              className="flex items-center gap-1 uppercase"
              onClick={() =>
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (!next.delete(g.group)) next.add(g.group);
                  return next;
                })
              }
            >
              <ChevronDown
                size={iconSize.tiny}
                className={collapsed.has(g.group) ? "-rotate-90" : ""}
                strokeWidth={ICON_STROKE}
              />
              {t(`ideas.group.${g.group}`)} · {g.ideas.length}
            </button>
          </h2>
          <ul className="m-0 list-none p-0" hidden={collapsed.has(g.group)}>
            {g.ideas.map((idea) => {
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
      {shown < visible.length ? (
        <div className="mt-6 flex justify-center">
          <Button onClick={() => setLimit((n) => n + PAGE_SIZE)}>
            {t("ideas.showMore", { shown, total: visible.length })}
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
