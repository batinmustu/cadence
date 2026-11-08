import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Select } from "../../components";
import { acceleratorFromEvent, DEFAULT_CAPTURE_SHORTCUT } from "../../core/generalSettings";
import { platform } from "../../platform";
import {
  type GeneralConfig,
  generalKeys,
  loadGeneralConfig,
  saveGeneralSetting,
} from "./generalConfig";

export function GeneralSettings() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<GeneralConfig | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadGeneralConfig().then(setConfig);
  }, []);
  if (!config) return null;

  const change = async (key: string, value: string) => {
    await saveGeneralSetting(key, value);
    setConfig(await loadGeneralConfig());
  };

  /** The old shortcut stays active (and stored) when the new one cannot be registered. */
  const setShortcut = async (accelerator: string) => {
    setError(null);
    try {
      await platform.window.setQuickCaptureShortcut(accelerator);
      await change(generalKeys.captureShortcut, accelerator);
    } catch {
      setError(t("settings.general.shortcutFailed", { shortcut: accelerator }));
    }
  };

  return (
    <div className="flex max-w-md flex-col gap-5">
      <div className="flex flex-col gap-1 text-xs text-text-3">
        <label htmlFor="gs-language">{t("settings.general.language")}</label>
        <Select
          id="gs-language"
          value={config.language}
          onValueChange={(v) => void change(generalKeys.language, v)}
        >
          <option value="system">{t("settings.general.system")}</option>
          <option value="en">English</option>
          <option value="tr">Türkçe</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1 text-xs text-text-3">
        <label htmlFor="gs-week">{t("settings.general.weekStart")}</label>
        <Select
          id="gs-week"
          value={config.weekStart}
          onValueChange={(v) => void change(generalKeys.weekStart, v)}
        >
          <option value="monday">{t("settings.general.monday")}</option>
          <option value="sunday">{t("settings.general.sunday")}</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1 text-xs text-text-3">
        <span id="gs-shortcut-label">{t("settings.general.shortcut")}</span>
        <div className="flex items-center gap-2">
          <Button
            aria-labelledby="gs-shortcut-label gs-shortcut-value"
            className="min-w-40"
            onClick={() => setRecording(true)}
            onBlur={() => setRecording(false)}
            onKeyDown={(e) => {
              if (!recording) return;
              e.preventDefault();
              if (e.key === "Escape") return setRecording(false);
              const accelerator = acceleratorFromEvent(e);
              if (!accelerator) return;
              setRecording(false);
              void setShortcut(accelerator);
            }}
          >
            <span id="gs-shortcut-value">
              {recording ? t("settings.general.pressKeys") : config.captureShortcut}
            </span>
          </Button>
          {config.captureShortcut !== DEFAULT_CAPTURE_SHORTCUT ? (
            <Button variant="ghost" onClick={() => void setShortcut(DEFAULT_CAPTURE_SHORTCUT)}>
              {t("settings.general.reset")}
            </Button>
          ) : null}
        </div>
        <p>{t("settings.general.shortcutNote")}</p>
        {error ? (
          <p role="alert" className="text-[13px] text-text-2">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
