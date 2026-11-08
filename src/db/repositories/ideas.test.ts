import { beforeEach, describe, expect, it } from "vitest";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { Database } from "../../platform/types";
import { prepareDatabase } from "../index";
import { createIdeasRepository, type IdeasRepository } from "./ideas";

let db: Database;
let repo: IdeasRepository;
let tick = 0;
beforeEach(async () => {
  db = await createSqlJsDatabase();
  await prepareDatabase(db);
  tick = 0;
  repo = createIdeasRepository(db, () => new Date(Date.UTC(2026, 10, 8, 10, 0, tick++)));
});

const platformIds = async () =>
  (await db.select<{ id: string }>("SELECT id FROM platforms ORDER BY sort_order")).map(
    (r) => r.id,
  );

async function makeTag(name: string): Promise<string> {
  const id = `tag-${name}`;
  await db.execute("INSERT INTO tags (id, name, created_at, updated_at) VALUES (?, ?, 'x', 'x')", [
    id,
    name,
  ]);
  return id;
}

describe("ideas repository", () => {
  it("creates and reads back with platforms and tags", async () => {
    const [p1, p2] = await platformIds();
    const tag = await makeTag("a");
    const created = await repo.create({
      title: " Hello ",
      platformIds: [p1 ?? "", p2 ?? ""],
      tagIds: [tag],
    });
    const got = await repo.get(created.id);
    expect(got).toEqual(created);
    expect(got?.platformIds).toHaveLength(2);
    expect(got?.tagIds).toEqual([tag]);
  });

  it("updates fields and replaces links", async () => {
    const [p1, p2] = await platformIds();
    const idea = await repo.create({ title: "x", platformIds: [p1 ?? ""] });
    const next = await repo.update(idea.id, {
      title: "y",
      status: "draft",
      platformIds: [p2 ?? ""],
    });
    expect(next?.updatedAt).not.toBe(idea.updatedAt);
    const got = await repo.get(idea.id);
    expect(got?.title).toBe("y");
    expect(got?.status).toBe("draft");
    expect(got?.platformIds).toEqual([p2]);
  });

  it("leaves links alone when the patch omits them", async () => {
    const [p1] = await platformIds();
    const idea = await repo.create({ title: "x", platformIds: [p1 ?? ""] });
    await repo.update(idea.id, { note: "n" });
    expect((await repo.get(idea.id))?.platformIds).toEqual([p1]);
  });

  it("returns null when updating a missing or deleted idea", async () => {
    expect(await repo.update("nope", { title: "a" })).toBeNull();
    const idea = await repo.create({ title: "x" });
    await repo.softDelete(idea.id);
    expect(await repo.update(idea.id, { title: "a" })).toBeNull();
  });

  it("soft deletes: hidden from list, row kept", async () => {
    const idea = await repo.create({ title: "x" });
    await repo.softDelete(idea.id);
    expect(await repo.list()).toEqual([]);
    expect(await repo.list({ includeDeleted: true })).toHaveLength(1);
    expect((await repo.get(idea.id))?.deletedAt).not.toBeNull();
  });

  it("lists newest first and filters", async () => {
    const [p1, p2] = await platformIds();
    const tag = await makeTag("t");
    const a = await repo.create({ title: "a", platformIds: [p1 ?? ""] });
    const b = await repo.create({ title: "b", platformIds: [p2 ?? ""], tagIds: [tag] });
    await repo.update(a.id, { status: "draft" });
    expect((await repo.list()).map((i) => i.title)).toEqual(["b", "a"]);
    expect((await repo.list({ statuses: ["draft"] })).map((i) => i.title)).toEqual(["a"]);
    expect((await repo.list({ platformId: p2 })).map((i) => i.id)).toEqual([b.id]);
    expect((await repo.list({ tagId: tag })).map((i) => i.id)).toEqual([b.id]);
  });
});
