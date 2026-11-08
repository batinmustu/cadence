export const supportedLanguages = ["en", "tr"] as const;
export type Language = (typeof supportedLanguages)[number];

/** Picks a supported language from a BCP 47 tag such as "tr-TR"; falls back to English. */
export function resolveLanguage(tag: string | undefined): Language {
  const base = tag?.toLowerCase().split("-")[0];
  return supportedLanguages.find((l) => l === base) ?? "en";
}
