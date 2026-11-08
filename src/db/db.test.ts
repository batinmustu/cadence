import { beforeEach, describe, expect, it } from "vitest";
import { createSqlJsDatabase } from "../platform/browser/sqljs";
import type { Database } from "../platform/types";
import { prepareDatabase } from "./index";
import { loadMigrations, runMigrations, splitStatements } from "./migrate";

let db: Database;
beforeEach(async () => {
  db = await createSqlJsDatabase();
});

const names = async () =>
  (
    await db.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).map((r) => r.name);

describe("migrations", () => {
  it("creates every table from the data model", async () => {
    await runMigrations(db);
    expect(await names()).toEqual(
      [
        "ai_commands",
        "content_types",
        "idea_platforms",
        "idea_tags",
        "ideas",
        "platforms",
        "posts",
        "schema_migrations",
        "series",
        "settings",
        "tags",
      ].sort(),
    );
  });

  it("is tracked and applies each version once", async () => {
    expect(await runMigrations(db)).toEqual([1, 2]);
    expect(await runMigrations(db)).toEqual([]);
  });

  it("indexes foreign keys and scheduled_at", async () => {
    await runMigrations(db);
    const idx = (
      await db.select<{ name: string }>("SELECT name FROM sqlite_master WHERE type='index'")
    ).map((r) => r.name);
    expect(idx).toContain("idx_posts_scheduled_at");
    expect(idx).toContain("idx_posts_idea");
    expect(idx).toContain("idx_ideas_series");
  });

  it("rolls back a failing migration", async () => {
    const bad = [
      { version: 1, name: "bad", sql: "CREATE TABLE a (x);\nSELECT nope FROM nothing;" },
    ];
    await expect(runMigrations(db, bad)).rejects.toThrow();
    expect(await names()).not.toContain("a");
  });

  it("loads files in version order and splits statements", () => {
    expect(loadMigrations().map((m) => m.version)).toEqual([1, 2]);
    expect(splitStatements("-- c\nA;\nB;\n")).toEqual(["A", "B"]);
  });

  it("enforces foreign keys", async () => {
    await runMigrations(db);
    await expect(
      db.execute(
        "INSERT INTO content_types (id,platform_id,name,field_schema,created_at,updated_at) VALUES ('c','missing','n','{}','t','t')",
      ),
    ).rejects.toThrow();
  });
});

describe("seed", () => {
  it("adds X and YouTube with their content types", async () => {
    await prepareDatabase(db);
    const types = await db.select<{ platform: string; name: string; field_schema: string }>(
      "SELECT p.name AS platform, c.name, c.field_schema FROM content_types c JOIN platforms p ON p.id = c.platform_id ORDER BY p.sort_order, c.sort_order",
    );
    expect(types.map((t) => `${t.platform}/${t.name}`)).toEqual([
      "X/Post",
      "X/Thread",
      "YouTube/Video",
      "YouTube/Short",
    ]);
    expect(JSON.parse(types[0]?.field_schema ?? "").fields[0]).toMatchObject({
      kind: "parts",
      maxPerPart: 280,
    });
  });

  it("is idempotent and keeps user edits", async () => {
    await prepareDatabase(db);
    await db.execute("UPDATE platforms SET name = 'Twitter' WHERE name = 'X'");
    await prepareDatabase(db);
    const rows = await db.select<{ name: string }>(
      "SELECT name FROM platforms ORDER BY sort_order",
    );
    expect(rows.map((r) => r.name)).toEqual(["Twitter", "YouTube"]);
    const [{ n } = { n: 0 }] = await db.select<{ n: number }>(
      "SELECT COUNT(*) AS n FROM content_types",
    );
    expect(n).toBe(4);
  });
});
