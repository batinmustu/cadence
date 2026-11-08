import { describe, expect, it } from "vitest";
import { createSqlJsDatabase } from "../platform/browser/sqljs";
import { exportAll, importAll } from "./dataTransfer";
import { prepareDatabase } from "./index";
import { createIdeasRepository } from "./repositories/ideas";
import { createTagsRepository } from "./repositories/tags";

async function fresh() {
  const db = await createSqlJsDatabase();
  await prepareDatabase(db);
  return db;
}

describe("export and import", () => {
  it("round-trips ideas and tags into an empty database", async () => {
    const a = await fresh();
    await createIdeasRepository(a).create({ title: "Round trip" });
    await createTagsRepository(a).findOrCreate("launch");
    const json = await exportAll(a);

    const b = await fresh();
    expect(await importAll(b, json)).toEqual({ ok: true });
    const titles = await b.select<{ title: string }>("SELECT title FROM ideas");
    expect(titles).toEqual([{ title: "Round trip" }]);
    expect(await b.select("SELECT name FROM tags")).toEqual([{ name: "launch" }]);
    // Presets come from the export, not from a second seed.
    const count = async (d: typeof a) =>
      (await d.select<{ n: number }>("SELECT COUNT(*) AS n FROM platforms"))[0]?.n;
    expect(await count(b)).toBe(await count(a));
  });

  it("refuses to import over existing content", async () => {
    const a = await fresh();
    const json = await exportAll(a);
    const b = await fresh();
    await createIdeasRepository(b).create({ title: "Mine" });
    expect(await importAll(b, json)).toEqual({ ok: false, reason: "notEmpty" });
    expect(await b.select("SELECT title FROM ideas")).toEqual([{ title: "Mine" }]);
  });

  it("changes nothing for an invalid file", async () => {
    const b = await fresh();
    const before = await exportAll(b, new Date(0));
    expect(await importAll(b, "{}")).toMatchObject({ ok: false, reason: "notCadence" });
    expect(await exportAll(b, new Date(0))).toBe(before);
  });

  it("resets to the seeded state if inserting fails midway", async () => {
    const a = await fresh();
    const file = JSON.parse(await exportAll(a));
    // Passes validation but breaks a CHECK constraint in the database.
    file.tables.ideas = [
      { id: "i1", title: "x", status: "bogus", created_at: "t", updated_at: "t" },
    ];
    const b = await fresh();
    expect(await importAll(b, JSON.stringify(file))).toEqual({ ok: false, reason: "failed" });
    const rows = await b.select<{ n: number }>("SELECT COUNT(*) AS n FROM platforms");
    expect(rows[0]?.n).toBeGreaterThan(0);
  });
});
