import { Link } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Segmented, Select } from "../../components";
import {
  filterIdeasByStatus,
  groupIdeasByDate,
  type IdeaFilterKey,
  type IdeaStatus,
  statusesForFilter,
} from "../../core/ideas";
import { CaptureBox } from "./CaptureBox";
import { useIdeas } from "./useIdeas";

const FILTERS: IdeaFilterKey[] = ["all", "draft", "planned", "published"];

export function IdeasScreen() {
  const { t, i18n } = useTranslation();
  const { ideas, platforms, tags, series, plannedAt, ready, capture } = useIdeas();
  const [filter, setFilter] = useState<IdeaFilterKey>("all");
  const [tagId, setTagId] = useState("");

  // Archived ideas stay out of the default view.
  const byTag = tagId ? ideas.filter((i) => i.tagIds.includes(tagId)) : ideas;
  const visible = filterIdeasByStatus(
    filter === "all" ? byTag.filter((i) => i.status !== "archived") : byTag,
    statusesForFilter(filter),
  );
  const groups = groupIdeasByDate(visible);
  const fmt = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" });

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("nav.ideas")}</h1>
        <div className="flex items-center gap-3">
          {tags.length > 0 ? (
            <Select
              aria-label={t("tags.filter")}
              className="h-8 w-40"
              value={tagId}
              onValueChange={(v) => setTagId(v)}
            >
              <option value="">{t("tags.allTags")}</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  #{tag.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Segmented
            label={t("ideas.filter.label")}
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({ value: f, label: t(`ideas.filter.${f}`) }))}
          />
        </div>
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
      {ready && ideas.length === 0 ? <p className="mt-8 text-text-3">{t("ideas.empty")}</p> : null}
      {groups.map((g) => (
        <div key={g.group} className="mt-8" data-testid={`group-${g.group}`}>
          <h2 className="mb-2 text-xs font-medium uppercase text-text-3">
            {t(`ideas.group.${g.group}`)}
          </h2>
          <ul className="m-0 list-none p-0">
            {g.ideas.map((idea) => {
              const planned = plannedAt[idea.id];
              const published = idea.status === "published";
              return (
                <li
                  key={idea.id}
                  className={`flex items-center gap-3 rounded-row px-2 py-2 hover:bg-surface ${published ? "opacity-60" : ""}`}
                >
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-row bg-surface-2 text-text-2">
                    <Lightbulb size={16} />
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
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function statusLabel(status: IdeaStatus, t: (k: string) => string): string {
  return status === "published" ? t("ideas.publishedMark") : t(`ideas.status.${status}`);
}
