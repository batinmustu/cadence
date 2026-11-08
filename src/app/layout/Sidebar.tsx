import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  Layers,
  Lightbulb,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components";
import { ICON_STROKE, iconSize } from "../../components/iconSize";
import type { SeriesRhythmLabel } from "../../core/weekdays";
import { CommandPalette } from "../../features/search/CommandPalette";
import { NewSeriesDialog } from "../../features/series/NewSeriesDialog";
import { useAiStatus } from "../../features/settings/aiConfig";
import { openSettings } from "../../features/settings/settingsState";
import { platform } from "../../platform";
import { sidebarTopInset } from "./sidebarInset";
import { useFullscreen } from "./useFullscreen";
import { useSeriesList } from "./useSeriesList";
import { useTitleBarDrag } from "./useWindowDrag";

const navItem =
  "flex h-8 w-full items-center gap-2.5 rounded-row px-2.5 text-left text-[13px] text-text-2 hover:bg-surface-2";
const activeProps = { className: `${navItem} bg-surface-2 text-text` };

export function Sidebar() {
  const dragRef = useTitleBarDrag<HTMLDivElement>();
  const { t } = useTranslation();
  const series = useSeriesList();
  const ai = useAiStatus();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const inset = sidebarTopInset(platform.window.platform, useFullscreen());

  const rhythmText = (r: SeriesRhythmLabel): string => {
    if (r.kind === "biweekly") return t("series.rhythm.biweekly");
    if (r.kind === "monthly") return t("series.rhythm.monthly");
    return r.days.map((d) => t(`weekday.${d}`)).join(" ");
  };

  return (
    <aside
      className="flex h-full w-60 shrink-0 flex-col bg-bg-sidebar px-3 pb-3"
      aria-label={t("nav.sidebar")}
    >
      {/* Drag row; on macOS the traffic lights sit here in a window and the row shrinks in full screen. */}
      <div
        ref={dragRef}
        style={{ height: inset }}
        className="shrink-0 transition-[height] duration-[var(--motion-duration)] ease-[var(--motion-ease)]"
      />
      <Button
        variant="secondary"
        className="mb-3 w-full justify-start text-text-3"
        onClick={() => setSearching(true)}
      >
        <Search size={iconSize.nav} strokeWidth={ICON_STROKE} />
        <span className="flex-1 text-left">{t("nav.search")}</span>
        <kbd className="text-[11px] text-text-4">⌘K</kbd>
      </Button>
      <nav className="flex flex-col gap-0.5" aria-label={t("nav.main")}>
        <Link to="/ideas" className={navItem} activeProps={activeProps}>
          <Lightbulb size={iconSize.nav} strokeWidth={ICON_STROKE} />
          {t("nav.ideas")}
        </Link>
        <Link to="/calendar" className={navItem} activeProps={activeProps}>
          <CalendarDays size={iconSize.nav} strokeWidth={ICON_STROKE} />
          {t("nav.calendar")}
        </Link>
        <Link to="/published" className={navItem} activeProps={activeProps}>
          <CheckCircle2 size={iconSize.nav} strokeWidth={ICON_STROKE} />
          {t("nav.published")}
        </Link>
      </nav>
      <div className="mt-5 mb-1 flex items-center justify-between px-2.5">
        <h2 className="text-xs font-medium text-text-4">{t("nav.series")}</h2>
        <Button
          variant="icon"
          className="size-7"
          aria-label={t("nav.newSeries")}
          onClick={() => setCreating(true)}
        >
          <Plus size={iconSize.action} strokeWidth={ICON_STROKE} />
        </Button>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {series.map((s) => (
          <li key={s.id}>
            <Link
              to="/series/$id"
              params={{ id: s.id }}
              className={navItem}
              activeProps={activeProps}
            >
              <Layers size={iconSize.nav} strokeWidth={ICON_STROKE} />
              <span className="flex-1 truncate">{s.name}</span>
              <span className="text-xs text-text-4">{rhythmText(s.rhythm)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-col gap-0.5 border-t border-divider pt-2">
        <button
          type="button"
          onClick={() => openSettings("ai")}
          className="flex h-8 w-full items-center gap-2.5 rounded-row px-2.5 text-left text-xs text-text-3 hover:bg-surface-2"
        >
          <span
            className={`size-1.5 rounded-full ${ai.state === "connected" ? "bg-text" : "bg-text-4"}`}
            aria-hidden="true"
          />
          {ai.state === "connected" ? (
            <span className="truncate">{t("nav.aiConnected", { model: ai.model })}</span>
          ) : (
            t("nav.aiNotConnected")
          )}
        </button>
        <button type="button" className={navItem} onClick={() => openSettings()}>
          <Settings size={iconSize.nav} strokeWidth={ICON_STROKE} />
          {t("nav.settings")}
        </button>
      </div>
      <CommandPalette
        open={searching}
        onOpenChange={setSearching}
        onNewSeries={() => setCreating(true)}
      />
      {creating ? (
        <NewSeriesDialog
          onClose={() => setCreating(false)}
          onCreated={(s) => void navigate({ to: "/series/$id", params: { id: s.id } })}
        />
      ) : null}
    </aside>
  );
}
