import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Segmented, Select, Textarea } from "../../components";
import {
  AI_PROVIDERS,
  type AiProviderId,
  MAX_TONE_LENGTH,
  normalizeTone,
  PROVIDER_INFO,
} from "../../core/aiSettings";
import { platform } from "../../platform";
import { type AiConfig, loadAiConfig, saveSetting, settingKeys } from "./aiConfig";

type TestState = "idle" | "testing" | "ok" | "failed";

export function AiSettings() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [tone, setTone] = useState("");
  const [test, setTest] = useState<TestState>("idle");

  const load = useCallback(async (provider?: AiProviderId) => {
    const c = await loadAiConfig(provider);
    setConfig(c);
    setTone(c.tone);
    setTest("idle");
    setKeyInput("");
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!config) return null;
  const { provider } = config;
  const info = PROVIDER_INFO[provider];
  const baseUrl = provider === "ollama" ? config.ollamaUrl : undefined;

  const choose = async (p: AiProviderId) => {
    await saveSetting(settingKeys.provider, p);
    await load(p);
  };
  const saveKey = async () => {
    const key = keyInput.trim();
    if (!key) return;
    await platform.secrets.setKey(provider, key);
    // A new key has not been tested yet.
    await saveSetting(settingKeys.verified(provider), "0");
    await load(provider);
  };
  const removeKey = async () => {
    await platform.secrets.clearKey(provider);
    await saveSetting(settingKeys.verified(provider), "0");
    await load(provider);
  };
  const runTest = async () => {
    setTest("testing");
    let ok = false;
    try {
      ok = await platform.ai.testConnection(provider, baseUrl);
    } catch {
      ok = false;
    }
    setTest(ok ? "ok" : "failed");
    await saveSetting(settingKeys.verified(provider), ok ? "1" : "0");
  };
  const canTest = info.needsKey ? config.hasKey : true;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Segmented
        label={t("settings.ai.provider")}
        value={provider}
        onChange={(p) => void choose(p)}
        options={AI_PROVIDERS.map((p) => ({ value: p, label: t(`settings.ai.providers.${p}`) }))}
      />

      {info.needsKey ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ai-key" className="text-[13px] font-medium">
            {t("settings.ai.apiKey")}
          </label>
          <div className="flex gap-2">
            <Input
              id="ai-key"
              type="password"
              autoComplete="off"
              value={keyInput}
              placeholder={config.hasKey ? t("settings.ai.keySaved") : "sk-…"}
              onChange={(e) => setKeyInput(e.target.value)}
            />
            <Button variant="secondary" disabled={!keyInput.trim()} onClick={() => void saveKey()}>
              {t("settings.ai.saveKey")}
            </Button>
          </div>
          <p className="text-xs text-text-3">{t("settings.ai.keychainNote")}</p>
          {config.hasKey ? (
            <div>
              <Button variant="secondary" onClick={() => void removeKey()}>
                {t("settings.ai.removeKey")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ai-url" className="text-[13px] font-medium">
            {t("settings.ai.serverUrl")}
          </label>
          <Input
            id="ai-url"
            value={config.ollamaUrl}
            onChange={(e) => setConfig({ ...config, ollamaUrl: e.target.value })}
            onBlur={() => void saveSetting(settingKeys.ollamaUrl, config.ollamaUrl.trim())}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={!canTest || test === "testing"}
          onClick={() => void runTest()}
        >
          {t("settings.ai.test")}
        </Button>
        <span role="status" className="text-[13px] text-text-3">
          {test === "ok" ? `✓ ${t("settings.ai.testOk")}` : null}
          {test === "failed" ? t("settings.ai.testFailed") : null}
          {test === "testing" ? t("settings.ai.testing") : null}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ai-model" className="text-[13px] font-medium">
          {t("settings.ai.model")}
        </label>
        {info.models.length > 0 ? (
          <Select
            id="ai-model"
            value={config.model}
            onChange={(e) => {
              setConfig({ ...config, model: e.target.value });
              void saveSetting(settingKeys.model(provider), e.target.value);
            }}
          >
            {info.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            id="ai-model"
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            onBlur={() => void saveSetting(settingKeys.model(provider), config.model.trim())}
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ai-tone" className="text-[13px] font-medium">
          {t("settings.ai.tone")}
        </label>
        <Textarea
          id="ai-tone"
          value={tone}
          maxLength={MAX_TONE_LENGTH}
          onChange={(e) => setTone(e.target.value)}
          onBlur={() => void saveSetting(settingKeys.tone, normalizeTone(tone))}
        />
        <p className="text-xs text-text-3">{t("settings.ai.toneNote")}</p>
      </div>
    </div>
  );
}
