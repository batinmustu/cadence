import { X } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { iconSize } from "@/components/iconSize";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { AiSettings } from "./AiSettings";
import { DataSettings } from "./DataSettings";
import { GeneralSettings } from "./GeneralSettings";
import { PlatformsSettings } from "./PlatformsSettings";
import {
  closeSettings,
  openSettings,
  SETTINGS_SECTIONS,
  setSettingsSection,
  useSettingsDialog,
} from "./settingsState";
import { TagsSettings } from "./TagsSettings";

export function SettingsDialog() {
  const { t } = useTranslation();
  const { open, section } = useSettingsDialog();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        openSettings();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? openSettings() : closeSettings())}>
      <DialogContent className="flex h-[min(40rem,calc(100vh-4rem))] w-[min(56rem,calc(100vw-4rem))] max-w-none gap-0 p-0">
        <DialogTitle className="sr-only">{t("nav.settings")}</DialogTitle>
        <DialogDescription className="sr-only">{t("settings.sections")}</DialogDescription>
        <nav
          aria-label={t("settings.sections")}
          className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-divider p-3"
        >
          <h2 className="mb-2 px-2.5 text-base font-semibold">{t("nav.settings")}</h2>
          {SETTINGS_SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              aria-current={s === section ? "page" : undefined}
              onClick={() => setSettingsSection(s)}
              className={`motion-colors flex h-8 items-center rounded-row px-2.5 text-left text-[13px] hover:bg-surface-2 ${s === section ? "bg-surface-2 text-text" : "text-text-2"}`}
            >
              {t(`settings.nav.${s}`)}
            </button>
          ))}
        </nav>
        <div key={section} className="motion-fade-in min-w-0 flex-1 overflow-y-auto p-6">
          {section === "ai" ? (
            <AiSettings />
          ) : section === "general" ? (
            <GeneralSettings />
          ) : section === "platforms" ? (
            <PlatformsSettings />
          ) : section === "tags" ? (
            <TagsSettings />
          ) : (
            <DataSettings />
          )}
        </div>
        <DialogClose
          aria-label={t("settings.close")}
          className="absolute top-3 right-3 rounded-row p-1 text-text-3 hover:bg-surface-2"
        >
          <X size={iconSize.action} />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
