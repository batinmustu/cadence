import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button, Input, Segmented, Select } from "../../components";
import { AI_PROVIDERS, type AiProviderId, PROVIDER_INFO } from "../../core/aiSettings";
import {
  isLastStep,
  isOptional,
  nextStep,
  ONBOARDING_STEPS,
  type OnboardingStep,
  previousStep,
} from "../../core/onboardingSteps";
import { platform } from "../../platform";
import { NewSeriesDialog } from "../series/NewSeriesDialog";
import { loadAiConfig, saveSetting, settingKeys } from "../settings/aiConfig";
import { generalKeys, loadGeneralConfig, saveGeneralSetting } from "../settings/generalConfig";
import { isOnboardingDone, markOnboardingDone } from "./onboardingConfig";

/** First-launch overlay. Skipping or finishing stores a flag so it never returns. */
export function Onboarding() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [language, setLanguage] = useState("system");
  const [provider, setProvider] = useState<AiProviderId>("anthropic");
  const [keyInput, setKeyInput] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [creating, setCreating] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the heading so keyboard and screen-reader users land on the new step.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refocus whenever the step or visibility changes
  useEffect(() => {
    if (visible) headingRef.current?.focus();
  }, [step, visible]);

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
    const following = nextStep(step);
    if (following) setStep(following);
    else void finish();
  };
  const back = () => {
    const before = previousStep(step);
    if (before) setStep(before);
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
      <Dialog open={!creating}>
        <DialogContent
          aria-describedby={undefined}
          className="flex flex-col gap-4 p-6"
          // Onboarding is left only through Skip or Done, never by a stray click or Escape.
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            headingRef.current?.focus();
          }}
          onKeyDown={(e) => {
            // Enter runs the primary action, except where it already means something.
            const el = e.target as HTMLElement;
            if (e.key === "Enter" && !el.closest("button,[role=combobox],[role=radio]")) {
              e.preventDefault();
              next();
            }
          }}
        >
          <p className="text-xs text-text-3">
            {t("onboarding.step", {
              n: ONBOARDING_STEPS.indexOf(step) + 1,
              total: ONBOARDING_STEPS.length,
            })}
          </p>

          {step === "welcome" ? (
            <>
              <DialogTitle ref={headingRef} tabIndex={-1} className="text-lg outline-none">
                {t("onboarding.welcome.title")}
              </DialogTitle>
              <p className="text-[13px] text-text-2">{t("onboarding.welcome.body")}</p>
              <div className="flex flex-col gap-1 text-xs text-text-3">
                <label htmlFor="ob-language">{t("settings.general.language")}</label>
                <Select
                  id="ob-language"
                  value={language}
                  onValueChange={(v) => {
                    setLanguage(v);
                    void saveGeneralSetting(generalKeys.language, v);
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
              <DialogTitle ref={headingRef} tabIndex={-1} className="text-lg outline-none">
                {t("onboarding.ai.title")}
              </DialogTitle>
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
              <DialogTitle ref={headingRef} tabIndex={-1} className="text-lg outline-none">
                {t("onboarding.series.title")}
              </DialogTitle>
              <p className="text-[13px] text-text-2">{t("onboarding.series.body")}</p>
              <div>
                <Button variant="secondary" onClick={() => setCreating(true)}>
                  {t("onboarding.series.create")}
                </Button>
              </div>
            </>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => void finish()}>
              {t("onboarding.skip")}
            </Button>
            <div className="flex items-center gap-2">
              {previousStep(step) ? <Button onClick={back}>{t("onboarding.back")}</Button> : null}
              {isOptional(step) ? <Button onClick={next}>{t("onboarding.skipStep")}</Button> : null}
              <Button variant="primary" onClick={next}>
                {isLastStep(step) ? t("onboarding.done") : t("onboarding.next")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {creating ? (
        <NewSeriesDialog onClose={() => setCreating(false)} onCreated={() => void finish()} />
      ) : null}
    </>
  );
}
