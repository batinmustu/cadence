import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AiSettings } from "./AiSettings";
import { PlatformsSettings } from "./PlatformsSettings";

const SECTIONS = ["general", "platforms", "ai", "data"] as const;

export function SettingsScreen({ section }: { section: string }) {
  const { t } = useTranslation();
  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold">{t("nav.settings")}</h1>
      <div className="flex gap-8">
        <nav aria-label={t("settings.sections")} className="flex w-40 shrink-0 flex-col gap-0.5">
          {SECTIONS.map((s) => (
            <Link
              key={s}
              to="/settings/$section"
              params={{ section: s }}
              className="flex h-8 items-center rounded-row px-2.5 text-[13px] text-text-2 hover:bg-surface-2"
              activeProps={{ className: "bg-surface-2 text-text" }}
            >
              {t(`settings.nav.${s}`)}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          {section === "ai" ? (
            <AiSettings />
          ) : section === "platforms" ? (
            <PlatformsSettings />
          ) : (
            <p className="text-text-3">{t("settings.comingSoon")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
