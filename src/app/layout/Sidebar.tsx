import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  Layers,
  Lightbulb,
  PanelLeft,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components";
import type { SeriesRhythmLabel } from "../../core/weekdays";
import { platform } from "../../platform";
import { useSeriesList } from "./useSeriesList";

const navItem =
  "flex h-8 items-center gap-2.5 rounded-row px-2.5 text-[13px] text-text-2 hover:bg-surface-2";
const activeProps = { className: `${navItem} bg-surface-2 text-text` };

export function Sidebar() {
  const { t } = useTranslation();
  const series = useSeriesList();
  const isMac = platform.window.platform === "macos";

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
      {/* Row 1 doubles as the drag region; on macOS the traffic lights sit in the left gap. */}
      <div
        data-tauri-drag-region
        className={`flex h-12 items-center justify-end ${isMac ? "pl-16" : ""}`}
      >
        <Button
          variant="icon"
          aria-label={t("nav.hideSidebar")}
          title={`${t("nav.hideSidebar")} (${platform.window.toggleSidebarShortcut})`}
        >
          <PanelLeft size={16} strokeWidth={1.7} />
        </Button>
      </div>
      <Button variant="secondary" className="mb-3 w-full justify-start text-text-3">
        <Search size={15} strokeWidth={1.7} />
        <span className="flex-1 text-left">{t("nav.search")}</span>
        <kbd className="text-[11px] text-text-4">⌘K</kbd>
      </Button>
      <nav className="flex flex-col gap-0.5" aria-label={t("nav.main")}>
        <Link to="/ideas" className={navItem} activeProps={activeProps}>
          <Lightbulb size={16} strokeWidth={1.7} />
          {t("nav.ideas")}
        </Link>
        <Link to="/calendar" className={navItem} activeProps={activeProps}>
          <CalendarDays size={16} strokeWidth={1.7} />
          {t("nav.calendar")}
        </Link>
        <Link to="/published" className={navItem} activeProps={activeProps}>
          <CheckCircle2 size={16} strokeWidth={1.7} />
          {t("nav.published")}
        </Link>
      </nav>
      <div className="mt-5 mb-1 flex items-center justify-between px-2.5">
        <h2 className="text-xs font-medium text-text-4">{t("nav.series")}</h2>
        <Button variant="icon" className="size-6" aria-label={t("nav.newSeries")} disabled>
          <Plus size={14} strokeWidth={1.7} />
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
              <Layers size={15} strokeWidth={1.7} />
              <span className="flex-1 truncate">{s.name}</span>
              <span className="text-xs text-text-4">{rhythmText(s.rhythm)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-col gap-0.5 border-t border-divider pt-2">
        <div className="flex h-8 items-center gap-2.5 px-2.5 text-xs text-text-3">
          <span className="size-1.5 rounded-full bg-text-4" aria-hidden="true" />
          {t("nav.aiNotConnected")}
        </div>
        <Link to="/settings" className={navItem} activeProps={activeProps}>
          <Settings size={16} strokeWidth={1.7} />
          {t("nav.settings")}
        </Link>
      </div>
    </aside>
  );
}
