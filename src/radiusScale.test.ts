import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

describe("radius scale", () => {
  it("only uses rounded-* utilities backed by the token scale", () => {
    const theme = readFileSync(path.join(root, "styles/globals.css"), "utf8");
    const defined = new Set([...theme.matchAll(/--radius-([a-z]+):/g)].map((m) => m[1]));
    const allowed = new Set([...defined, "full", "none"]);
    const bad: string[] = [];
    for (const f of files(root)) {
      for (const m of readFileSync(f, "utf8").matchAll(/\brounded(?:-([\w[\]./-]+))?\b/g)) {
        if (m[1] !== undefined && !allowed.has(m[1]))
          bad.push(`${path.relative(root, f)}: ${m[0]}`);
        if (m[1] === undefined) bad.push(`${path.relative(root, f)}: rounded`);
      }
    }
    expect(bad).toEqual([]);
  });
});
