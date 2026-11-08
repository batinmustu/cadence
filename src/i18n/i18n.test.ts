import { describe, expect, it } from "vitest";
import { resolveLanguage } from "./index";
import en from "./locales/en.json";
import tr from "./locales/tr.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? keys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("locales", () => {
  it("have identical keys in en and tr", () => {
    expect(keys(tr).sort()).toEqual(keys(en).sort());
  });
});

describe("resolveLanguage", () => {
  it("maps OS tags to supported languages", () => {
    expect(resolveLanguage("tr-TR")).toBe("tr");
    expect(resolveLanguage("en-US")).toBe("en");
    expect(resolveLanguage("de")).toBe("en");
    expect(resolveLanguage(undefined)).toBe("en");
  });
});
