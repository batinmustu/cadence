import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { type Language, resolveLanguage, supportedLanguages } from "./language";
import en from "./locales/en.json";
import tr from "./locales/tr.json";

export { type Language, resolveLanguage, supportedLanguages };

const osLanguage = typeof navigator === "undefined" ? undefined : navigator.language;

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, tr: { translation: tr } },
  lng: resolveLanguage(osLanguage),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
