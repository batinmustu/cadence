import { type Language, resolveLanguage } from "../i18n/language";

// Pure helpers for the General settings: language, week start, capture shortcut.

export type LanguagePref = "system" | Language;
export type WeekStart = "monday" | "sunday";

export const DEFAULT_CAPTURE_SHORTCUT = "Alt+Space";

export function parseLanguagePref(raw: string | null): LanguagePref {
  return raw === "en" || raw === "tr" ? raw : "system";
}

export function parseWeekStart(raw: string | null): WeekStart {
  return raw === "sunday" ? "sunday" : "monday";
}

/** The language to show: an explicit choice, or the OS language ("system"). */
export function effectiveLanguage(pref: LanguagePref, osTag: string | undefined): Language {
  return pref === "system" ? resolveLanguage(osTag) : pref;
}

export interface ShortcutKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const MODIFIER_KEYS = new Set(["Control", "Meta", "Alt", "Shift", "AltGraph", "OS"]);
const NAMED_KEY =
  /^(F\d{1,2}|Arrow(Up|Down|Left|Right)|Enter|Tab|Backspace|Delete|Home|End|PageUp|PageDown)$/;

/**
 * Turns a key press into an accelerator such as "Alt+Space". Returns null while
 * only modifiers are held, for keys that cannot be registered, and when no
 * modifier is held (a bare key as a global shortcut would hijack typing).
 */
export function acceleratorFromEvent(e: ShortcutKeyEvent): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null;
  const mods = [
    e.ctrlKey ? "Ctrl" : "",
    e.altKey ? "Alt" : "",
    e.shiftKey ? "Shift" : "",
    e.metaKey ? "Cmd" : "",
  ].filter(Boolean);
  if (mods.length === 0) return null;
  let key: string | null = null;
  if (e.key === " ") key = "Space";
  else if (/^[a-z0-9]$/i.test(e.key)) key = e.key.toUpperCase();
  else if (NAMED_KEY.test(e.key)) key = e.key;
  return key ? [...mods, key].join("+") : null;
}
