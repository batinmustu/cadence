import { describe, expect, it } from "vitest";
import {
  acceleratorFromEvent,
  effectiveLanguage,
  parseLanguagePref,
  parseWeekStart,
} from "./generalSettings";

const press = (
  key: string,
  mods: Partial<Record<"ctrlKey" | "metaKey" | "altKey" | "shiftKey", boolean>> = {},
) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe("preferences", () => {
  it("parses stored values with safe defaults", () => {
    expect(parseLanguagePref("tr")).toBe("tr");
    expect(parseLanguagePref("de")).toBe("system");
    expect(parseLanguagePref(null)).toBe("system");
    expect(parseWeekStart("sunday")).toBe("sunday");
    expect(parseWeekStart("x")).toBe("monday");
  });
  it("resolves the effective language", () => {
    expect(effectiveLanguage("system", "tr-TR")).toBe("tr");
    expect(effectiveLanguage("system", "fr-FR")).toBe("en");
    expect(effectiveLanguage("en", "tr-TR")).toBe("en");
  });
});

describe("acceleratorFromEvent", () => {
  it("builds accelerators from modified key presses", () => {
    expect(acceleratorFromEvent(press(" ", { altKey: true }))).toBe("Alt+Space");
    expect(acceleratorFromEvent(press("k", { metaKey: true, shiftKey: true }))).toBe("Shift+Cmd+K");
    expect(acceleratorFromEvent(press("F5", { ctrlKey: true }))).toBe("Ctrl+F5");
    expect(acceleratorFromEvent(press("ArrowUp", { altKey: true }))).toBe("Alt+ArrowUp");
  });
  it("rejects modifiers alone, bare keys and unsupported keys", () => {
    expect(acceleratorFromEvent(press("Alt", { altKey: true }))).toBeNull();
    expect(acceleratorFromEvent(press("k"))).toBeNull();
    expect(acceleratorFromEvent(press("ç", { altKey: true }))).toBeNull();
  });
});
