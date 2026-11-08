import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Segmented, Select } from "../../components";
import { AI_PROVIDERS, type AiProviderId, PROVIDER_INFO } from "../../core/aiSettings";
import { platform } from "../../platform";
import { NewSeriesDialog } from "../series/NewSeriesDialog";
import { loadAiConfig, saveSetting, settingKeys } from "../settings/aiConfig";
import { generalKeys, loadGeneralConfig, saveGeneralSetting } from "../settings/generalConfig";
import { isOnboardingDone, markOnboardingDone } from "./onboardingConfig";

type Step = "welcome" | "ai" | "series";
const STEPS: Step[] = ["welcome", "ai", "series"];

/** First-launch overlay. Skipping or finishing stores a flag so it never returns. */
export function Onboarding() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>("welcome");
  const [language, setLanguage] = useState("system");
  const [provider, setProvider] = useState<AiProviderId>("anthropic");
  const [keyInput, setKeyInput] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    void isOnboardingDone().then((done) => alive && setVisible(!done));
    void loadGeneralConfig()
      .then((c) => alive && setLanguage(c.language))
      .catch(() => {});
    void loadAiConfig()
      .then((c) => alive && setProvider(c.provider))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!visible) return null;
  const info = PROVIDER_INFO[provider];

  const finish = async () => {
    await markOnboardingDone().catch(() => {});
    setVisible(false);
  };
  const next = () => {
    const i = STEPS.indexOf(step);
    const following = STEPS[i + 1];
    if (following) setStep(following);
    else void finish();
  };
  const chooseProvider = async (p: AiProviderId) => {
    setProvider(p);
    setKeySaved(false);
    await saveSetting(settingKeys.provider, p);
  };
  const saveKey = async () => {
    const key = keyInput.trim();
    if (!key) return;
    await platform.secrets.setKey(provider, key);
    await saveSetting(settingKeys.verified(provider), "0");
    setKeyInput("");
    setKeySaved(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("onboarding.title")}
          className="flex w-[28rem] flex-col gap-4 rounded-card bg-bg p-6 shadow-lg"
        >
          <p className="text-xs text-text-3">
            {t("onboarding.step", { n: STEPS.indexOf(step) + 1, total: STEPS.length })}
          </p>

          {step === "welcome" ? (
            <>
              <h2 className="text-lg font-semibold">{t("onboarding.welcome.title")}</h2>
              <p className="text-[13px] text-text-2">{t("onboarding.welcome.body")}</p>
              <div className="flex flex-col gap-1 text-xs text-text-3">
                <label htmlFor="ob-language">{t("settings.general.language")}</label>
                <Select
                  id="ob-language"
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    void saveGeneralSetting(generalKeys.language, e.target.value);
                  }}
                >
                  <option value="system">{t("settings.general.system")}</option>
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </Select>
              </div>
            </>
          ) : null}

          {step === "ai" ? (
            <>
              <h2 className="text-lg font-semibold">{t("onboarding.ai.title")}</h2>
              <p className="text-[13px] text-text-2">{t("onboarding.ai.body")}</p>
              <Segmented
                label={t("settings.ai.provider")}
                value={provider}
                onChange={(p) => void chooseProvider(p)}
                options={AI_PROVIDERS.map((p) => ({
                  value: p,
                  label: t(`settings.ai.providers.${p}`),
                }))}
              />
              {info.needsKey ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ob-key" className="text-[13px] font-medium">
                    {t("settings.ai.apiKey")}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="ob-key"
                      type="password"
                      autoComplete="off"
                      value={keyInput}
                      placeholder="sk-…"
                      onChange={(e) => setKeyInput(e.target.value)}
                    />
                    <Button
                      variant="secondary"
                      disabled={!keyInput.trim()}
                      onClick={() => void saveKey()}
                    >
                      {t("settings.ai.saveKey")}
                    </Button>
                  </div>
                  <p role="status" className="text-xs text-text-3">
                    {keySaved ? `✓ ${t("onboarding.ai.saved")}` : t("settings.ai.keychainNote")}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-text-3">{t("onboarding.ai.ollama")}</p>
              )}
            </>
          ) : null}

          {step === "series" ? (
            <>
              <h2 className="text-lg font-semibold">{t("onboarding.series.title")}</h2>
              <p className="text-[13px] text-text-2">{t("onboarding.series.body")}</p>
              <div>
                <Button variant="secondary" onClick={() => setCreating(true)}>
                  {t("onboarding.series.create")}
                </Button>
              </div>
            </>
          ) : null}

          <div className="mt-2 flex items-center justify-between">
            <Button onClick={() => void finish()}>{t("onboarding.skip")}</Button>
            <Button variant="primary" onClick={next}>
              {step === "series" ? t("onboarding.done") : t("onboarding.next")}
            </Button>
          </div>
        </div>
      </div>
      {creating ? (
        <NewSeriesDialog onClose={() => setCreating(false)} onCreated={() => void finish()} />
      ) : null}
    </>
  );
}
