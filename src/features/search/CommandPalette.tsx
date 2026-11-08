import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { type SearchHit, type SearchItem, searchItems } from "../../core/search";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createSeriesRepository } from "../../db/repositories/series";
import { createTagsRepository } from "../../db/repositories/tags";
import { platform } from "../../platform";
import { openSettings } from "../settings/settingsState";

interface Entry {
  key: string;
  group: "commands" | "ideas" | "series" | "tags";
  label: string;
  run: () => void;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewSeries: () => void;
}

async function loadItems(): Promise<SearchItem[]> {
  const db = platform.database;
  const [ideas, series, tags] = await Promise.all([
    createIdeasRepository(db).list(),
    createSeriesRepository(db).list(),
    createTagsRepository(db).list(),
  ]);
  // A tag result opens the newest idea that carries it, so tags without ideas are not offered.
  const firstIdeaByTag = new Map<string, string>();
  for (const idea of ideas) {
    for (const tagId of idea.tagIds)
      if (!firstIdeaByTag.has(tagId)) firstIdeaByTag.set(tagId, idea.id);
  }
  return [
    ...ideas.map((i) => ({ kind: "idea" as const, id: i.id, label: i.title, detail: i.note })),
    ...series.map((s) => ({
      kind: "series" as const,
      id: s.id,
      label: s.name,
      detail: s.description,
    })),
    ...tags.flatMap((t) => {
      const ideaId = firstIdeaByTag.get(t.id);
      return ideaId ? [{ kind: "tag" as const, id: ideaId, label: `#${t.name}` }] : [];
    }),
  ];
}

export function CommandPalette({ open, onOpenChange, onNewSeries }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    let cancelled = false;
    loadItems()
      .then((loaded) => {
        if (!cancelled) setItems(loaded);
      })
      .catch(() => {
        // Search degrades to commands only.
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const close = (fn: () => void) => () => {
      onOpenChange(false);
      fn();
    };
    const go = (to: "/ideas" | "/calendar" | "/published") => close(() => void navigate({ to }));
    const nav: Entry[] = [
      { key: "c-ideas", group: "commands", label: t("nav.ideas"), run: go("/ideas") },
      { key: "c-calendar", group: "commands", label: t("nav.calendar"), run: go("/calendar") },
      { key: "c-published", group: "commands", label: t("nav.published"), run: go("/published") },
      {
        key: "c-settings",
        group: "commands",
        label: t("nav.settings"),
        run: close(() => openSettings()),
      },
      {
        key: "c-new-idea",
        group: "commands",
        label: t("search.newIdea"),
        run: close(() => {
          void navigate({ to: "/ideas" });
          import("../ideas/captureFocus").then((m) => m.requestCaptureFocus());
        }),
      },
      {
        key: "c-new-series",
        group: "commands",
        label: t("nav.newSeries"),
        run: close(onNewSeries),
      },
    ];
    if (!query.trim()) return nav;
    const matchedCommands = searchItems(
      nav.map((n) => ({ kind: "idea" as const, id: n.key, label: n.label })),
      query,
    ).map((h) => nav.find((n) => n.key === h.id));
    const found = searchItems(items, query, 12).map((h: SearchHit): Entry => {
      if (h.kind === "series") {
        return {
          key: `s-${h.id}`,
          group: "series",
          label: h.label,
          run: close(() => void navigate({ to: "/series/$id", params: { id: h.id } })),
        };
      }
      return {
        key: `${h.kind}-${h.id}`,
        group: h.kind === "tag" ? "tags" : "ideas",
        label: h.label,
        run: close(() => void navigate({ to: "/ideas/$id", params: { id: h.id } })),
      };
    });
    const commands = matchedCommands.filter((c): c is Entry => c !== undefined);
    return [
      ...found.filter((e) => e.group === "ideas"),
      ...found.filter((e) => e.group === "series"),
      ...found.filter((e) => e.group === "tags"),
      ...commands,
    ];
  }, [items, query, t, navigate, onOpenChange, onNewSeries]);

  const activeIndex = Math.min(active, Math.max(entries.length - 1, 0));
  useEffect(() => {
    listRef.current
      ?.querySelectorAll('[role="option"]')
      [activeIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, entries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      entries[activeIndex]?.run();
    }
  };

  let lastGroup = "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] w-[min(36rem,calc(100vw-2rem))] translate-y-0 p-0">
        <DialogTitle className="sr-only">{t("search.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("search.hint")}</DialogDescription>
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-label={t("search.title")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("search.placeholder")}
          className="h-12 w-full border-b border-divider bg-transparent px-4 text-sm text-foreground outline-none placeholder:text-text-4"
        />
        <div
          id="palette-list"
          ref={listRef}
          role="listbox"
          aria-label={t("search.results")}
          className="max-h-80 overflow-y-auto p-2"
        >
          {entries.map((entry, i) => {
            const heading = entry.group !== lastGroup;
            lastGroup = entry.group;
            return (
              <div key={entry.key} role="presentation">
                {heading ? (
                  <div className="px-2.5 pt-2 pb-1 text-xs font-medium text-text-4">
                    {t(`search.group.${entry.group}`)}
                  </div>
                ) : null}
                <div
                  role="option"
                  aria-selected={i === activeIndex}
                  tabIndex={-1}
                  onMouseMove={() => setActive(i)}
                  onClick={entry.run}
                  onKeyDown={(e) => e.key === "Enter" && entry.run()}
                  className={`flex h-8 cursor-pointer items-center rounded-row px-2.5 text-[13px] text-text-2 ${i === activeIndex ? "bg-surface-2 text-text" : ""}`}
                >
                  <span className="truncate">{entry.label}</span>
                </div>
              </div>
            );
          })}
          {query.trim() && !entries.length ? (
            <div className="px-2.5 py-6 text-center text-sm text-text-3">
              {t("search.noResults", { query: query.trim() })}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
