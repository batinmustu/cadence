import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import tr from "./locales/tr.json";

export const supportedLanguages = ["en", "tr"] as const;
export type Language = (typeof supportedLanguages)[number];

/** Picks a supported language from a BCP 47 tag such as "tr-TR"; falls back to English. */
export function resolveLanguage(tag: string | undefined): Language {
  const base = tag?.toLowerCase().split("-")[0];
  return supportedLanguages.find((l) => l === base) ?? "en";
}

const osLanguage = typeof navigator === "undefined" ? undefined : navigator.language;

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, tr: { translation: tr } },
  lng: resolveLanguage(osLanguage),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
