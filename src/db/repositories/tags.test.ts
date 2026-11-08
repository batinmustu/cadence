import { beforeEach, describe, expect, it } from "vitest";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import { prepareDatabase } from "../index";
import { createIdeasRepository } from "./ideas";
import { createTagsRepository, type TagsRepository } from "./tags";

let repo: TagsRepository;
let ideas: ReturnType<typeof createIdeasRepository>;
beforeEach(async () => {
  const db = await createSqlJsDatabase();
  await prepareDatabase(db);
  repo = createTagsRepository(db);
  ideas = createIdeasRepository(db);
});

describe("tags repository", () => {
  it("creates once and reuses regardless of case or hash", async () => {
    const a = await repo.findOrCreate("#Launch");
    const b = await repo.findOrCreate("launch");
    expect(a?.id).toBe(b?.id);
    expect(await repo.list()).toHaveLength(1);
  });
  it("ignores empty names", async () => {
    expect(await repo.findOrCreate(" # ")).toBeNull();
  });
  it("lists alphabetically", async () => {
    await repo.findOrCreate("b");
    await repo.findOrCreate("A");
    expect((await repo.list()).map((t) => t.name)).toEqual(["A", "b"]);
  });
  it("filters ideas by tag", async () => {
    const tag = await repo.findOrCreate("x");
    if (!tag) throw new Error("tag");
    const tagged = await ideas.create({ title: "one", tagIds: [tag.id] });
    await ideas.create({ title: "two" });
    const out = await ideas.list({ tagId: tag.id });
    expect(out.map((i) => i.id)).toEqual([tagged.id]);
  });
});
