import { describe, expect, it } from "vitest";
import { backupFileName, buildExport, exportFileName, validateExport } from "./backup";

const stamps = { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
const good = () =>
  buildExport(
    {
      platforms: [{ id: "p1", name: "X", icon: "x", ...stamps }],
      ideas: [{ id: "i1", title: "Idea", ...stamps }],
      tags: [],
    },
    new Date("2026-11-08T10:00:00Z"),
  );

describe("validateExport", () => {
  it("accepts a built export", () => {
    const r = validateExport(JSON.stringify(good()));
    expect(r.ok).toBe(true);
  });
  it("rejects non-JSON and foreign files", () => {
    expect(validateExport("nope")).toMatchObject({ ok: false, reason: "notJson" });
    expect(validateExport('{"a":1}')).toMatchObject({ ok: false, reason: "notCadence" });
  });
  it("rejects newer versions", () => {
    const f = { ...good(), version: 99 };
    expect(validateExport(JSON.stringify(f))).toMatchObject({ ok: false, reason: "tooNew" });
  });
  it("rejects unknown tables and columns", () => {
    const f = good();
    (f.tables as Record<string, unknown>).evil = [];
    expect(validateExport(JSON.stringify(f))).toMatchObject({ ok: false, reason: "invalid" });
    const g = good();
    g.tables.ideas = [{ id: "i1", title: "x", ...stamps, "title) VALUES (1); --": "x" }];
    expect(validateExport(JSON.stringify(g))).toMatchObject({ ok: false, reason: "invalid" });
  });
  it("rejects missing required columns, duplicate ids and dangling references", () => {
    const a = good();
    a.tables.ideas = [{ id: "i1", ...stamps }];
    expect(validateExport(JSON.stringify(a)).ok).toBe(false);
    const b = good();
    b.tables.ideas = [
      { id: "i1", title: "a", ...stamps },
      { id: "i1", title: "b", ...stamps },
    ];
    expect(validateExport(JSON.stringify(b)).ok).toBe(false);
    const c = good();
    c.tables.idea_platforms = [{ id: "x", idea_id: "i1", platform_id: "missing", ...stamps }];
    expect(validateExport(JSON.stringify(c)).ok).toBe(false);
  });
});

describe("file names", () => {
  it("uses the local calendar day", () => {
    const d = new Date(2026, 10, 8, 12);
    expect(exportFileName(d)).toBe("cadence-export-2026-11-08.json");
    expect(backupFileName(d)).toBe("cadence-2026-11-08.db");
  });
});
