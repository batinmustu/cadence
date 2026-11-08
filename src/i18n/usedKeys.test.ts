import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "./locales/en.json";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
}

function has(obj: Record<string, unknown>, path: string): boolean {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (typeof cur !== "object" || cur === null || !(part in cur)) return false;
    cur = (cur as Record<string, unknown>)[part];
  }
  return true;
}

// Plural keys are stored as key_one / key_other.
const exists = (key: string) => has(en, key) || has(en, `${key}_one`) || has(en, `${key}_other`);

describe("i18n keys used in code", () => {
  it("every literal t('…') key exists in en.json", () => {
    const missing: string[] = [];
    for (const file of walk(join(__dirname, ".."))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/\bt\(\s*"([a-zA-Z][\w.]*\.[\w.]+)"/g)) {
        const key = m[1] ?? "";
        if (!exists(key)) missing.push(`${file.split("/src/")[1]}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
