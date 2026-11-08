import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

describe("native selects", () => {
  it("are not used; use components/ui/select", () => {
    const root = path.resolve(import.meta.dirname);
    const offenders = files(root).filter(
      (f) => !f.endsWith("noNativeSelect.test.ts") && /<select[\s>]/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
