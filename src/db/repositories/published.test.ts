import { beforeEach, describe, expect, it } from "vitest";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { Database } from "../../platform/types";
import { prepareDatabase } from "../index";
import { PRESET_CONTENT_TYPES } from "../seed/presets";
import { createIdeasRepository } from "./ideas";
import { createPostsRepository } from "./posts";
import { listPublished } from "./published";
import { createSeriesRepository } from "./series";

const CT = PRESET_CONTENT_TYPES[0].id;
let db: Database;
beforeEach(async () => {
  db = await createSqlJsDatabase();
  await prepareDatabase(db);
});

async function publish(title: string, at: string, seriesId?: string) {
  const idea = await createIdeasRepository(db).create({ title, seriesId: seriesId ?? null });
  const posts = createPostsRepository(db);
  const post = await posts.create({ ideaId: idea.id, contentTypeId: CT });
  await posts.update(post.id, { status: "published", publishedAt: at });
  return { idea, post };
}

describe("listPublished", () => {
  it("lists published posts newest first with platform and series", async () => {
    const [p] = await db.select<{ id: string }>(
      "SELECT id FROM platforms ORDER BY sort_order LIMIT 1",
    );
    const series = await createSeriesRepository(db).create({
      name: "Weekly",
      platformId: p?.id ?? "",
      weekdays: [1],
    });
    await publish("Old", "2026-10-01T10:00:00.000Z");
    await publish("New", "2026-11-05T10:00:00.000Z", series.id);
    const { items, total } = await listPublished(db);
    expect(total).toBe(2);
    expect(items.map((i) => i.title)).toEqual(["New", "Old"]);
    expect(items[0]?.seriesName).toBe("Weekly");
    expect(items[0]?.platformName).toBeTruthy();
  });

  it("filters by series, paginates and skips drafts and deleted ideas", async () => {
    const [p] = await db.select<{ id: string }>(
      "SELECT id FROM platforms ORDER BY sort_order LIMIT 1",
    );
    const series = await createSeriesRepository(db).create({
      name: "S",
      platformId: p?.id ?? "",
      weekdays: [1],
    });
    await publish("A", "2026-11-01T10:00:00.000Z", series.id);
    await publish("B", "2026-11-02T10:00:00.000Z");
    const gone = await publish("C", "2026-11-03T10:00:00.000Z");
    await createIdeasRepository(db).softDelete(gone.idea.id);
    const draftIdea = await createIdeasRepository(db).create({ title: "Draft" });
    await createPostsRepository(db).create({ ideaId: draftIdea.id, contentTypeId: CT });

    expect((await listPublished(db, { seriesId: series.id })).items.map((i) => i.title)).toEqual([
      "A",
    ]);
    const page = await listPublished(db, { limit: 1, offset: 1 });
    expect(page.items.map((i) => i.title)).toEqual(["A"]);
    expect(page.total).toBe(2);
  });
});
