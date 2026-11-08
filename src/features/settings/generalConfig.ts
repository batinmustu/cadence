import { useEffect, useState } from "react";
import {
  DEFAULT_CAPTURE_SHORTCUT,
  effectiveLanguage,
  type LanguagePref,
  parseLanguagePref,
  parseWeekStart,
  type WeekStart,
} from "../../core/generalSettings";
import { createSettingsRepository } from "../../db/repositories/settings";
import i18n from "../../i18n";
import { platform } from "../../platform";

export const generalKeys = {
  language: "general.language",
  weekStart: "general.weekStart",
  captureShortcut: "general.captureShortcut",
};

export interface GeneralConfig {
  language: LanguagePref;
  weekStart: WeekStart;
  captureShortcut: string;
}

const repo = () => createSettingsRepository(platform.database);
const listeners = new Set<() => void>();

export async function loadGeneralConfig(): Promise<GeneralConfig> {
  const s = repo();
  const [language, weekStart, shortcut] = await Promise.all([
    s.get(generalKeys.language),
    s.get(generalKeys.weekStart),
    s.get(generalKeys.captureShortcut),
  ]);
  return {
    language: parseLanguagePref(language),
    weekStart: parseWeekStart(weekStart),
    captureShortcut: shortcut?.trim() || DEFAULT_CAPTURE_SHORTCUT,
  };
}

export async function saveGeneralSetting(key: string, value: string): Promise<void> {
  await repo().set(key, value);
  if (key === generalKeys.language) await applyLanguage();
  for (const l of listeners) l();
}

export async function applyLanguage(): Promise<void> {
  const { language } = await loadGeneralConfig();
  const osTag = typeof navigator === "undefined" ? undefined : navigator.language;
  await i18n.changeLanguage(effectiveLanguage(language, osTag));
}

/** Applies stored language and shortcut at startup; failures never block the app. */
export async function applyGeneralSettings(): Promise<void> {
  const config = await loadGeneralConfig();
  await applyLanguage();
  if (config.captureShortcut !== DEFAULT_CAPTURE_SHORTCUT) {
    await platform.window.setQuickCaptureShortcut(config.captureShortcut).catch(() => {});
  }
}

export function useWeekStart(): WeekStart {
  const [weekStart, setWeekStart] = useState<WeekStart>("monday");
  useEffect(() => {
    let alive = true;
    const load = () =>
      loadGeneralConfig()
        .then((c) => alive && setWeekStart(c.weekStart))
        .catch(() => {});
    void load();
    listeners.add(load);
    return () => {
      alive = false;
      listeners.delete(load);
    };
  }, []);
  return weekStart;
}
