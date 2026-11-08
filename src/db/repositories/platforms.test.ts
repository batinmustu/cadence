import { beforeEach, describe, expect, it } from "vitest";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { Database } from "../../platform/types";
import { prepareDatabase } from "..";
import { createIdeasRepository } from "./ideas";
import { createPlatformsRepository, type PlatformsRepository } from "./platforms";
import { createPostsRepository } from "./posts";

let db: Database;
let repo: PlatformsRepository;
beforeEach(async () => {
  db = await createSqlJsDatabase();
  await prepareDatabase(db);
  repo = createPlatformsRepository(db);
});

describe("platforms repository", () => {
  it("creates, renames and reorders platforms", async () => {
    const p = await repo.create("  Blog ");
    expect(p.name).toBe("Blog");
    await repo.rename(p.id, "Newsletter");
    const before = await repo.list();
    expect(before.map((x) => x.name)).toEqual(["X", "YouTube", "Newsletter"]);
    await repo.reorder([p.id, ...before.filter((x) => x.id !== p.id).map((x) => x.id)]);
    expect((await repo.list()).map((x) => x.name)).toEqual(["Newsletter", "X", "YouTube"]);
    await expect(repo.create("  ")).rejects.toThrow();
  });

  it("hides presets instead of deleting them", async () => {
    const [x] = await repo.list();
    expect(await repo.remove(x?.id ?? "")).toBe("preset");
    await repo.setHidden(x?.id ?? "", true);
    expect((await repo.list())[0]?.hidden).toBe(true);
    expect((await repo.listVisible()).map((p) => p.name)).toEqual(["YouTube"]);
    await repo.setHidden(x?.id ?? "", false);
    expect(await repo.listVisible()).toHaveLength(2);
  });

  it("deletes an unused custom platform with its content types, but not one in use", async () => {
    const p = await repo.create("Blog");
    await repo.saveContentType({
      platformId: p.id,
      name: "Article",
      schema: { fields: [{ key: "body", kind: "longtext" }] },
    });
    const [ct] = await repo.listContentTypes(p.id);
    const idea = await createIdeasRepository(db).create({ title: "Idea" });
    const post = await createPostsRepository(db).create({
      ideaId: idea.id,
      contentTypeId: ct?.id ?? "",
    });
    expect(await repo.remove(p.id)).toBe("inUse");
    expect(await repo.removeContentType(ct?.id ?? "")).toBe("inUse");
    await db.execute("DELETE FROM posts WHERE id = ?", [post.id]);
    expect(await repo.remove(p.id)).toBe("removed");
    expect((await repo.list()).map((x) => x.name)).not.toContain("Blog");
  });

  it("saves and edits content types, rejecting invalid schemas", async () => {
    const p = await repo.create("Blog");
    await repo.saveContentType({
      platformId: p.id,
      name: "Article",
      schema: { fields: [{ key: "body", kind: "longtext", max: 100 }] },
    });
    const [ct] = await repo.listContentTypes(p.id);
    expect(ct?.schema.fields[0]).toMatchObject({ key: "body", max: 100 });
    await repo.saveContentType({
      id: ct?.id,
      platformId: p.id,
      name: "Essay",
      schema: ct?.schema ?? { fields: [] },
    });
    expect((await repo.listContentTypes(p.id))[0]?.name).toBe("Essay");
    await expect(
      repo.saveContentType({
        platformId: p.id,
        name: "Bad",
        schema: { fields: [{ key: "x", kind: "text", max: -1 }] },
      }),
    ).rejects.toThrow("Invalid schema");
    const presetType = (await repo.listContentTypes((await repo.list())[0]?.id ?? ""))[0];
    expect(await repo.removeContentType(presetType?.id ?? "")).toBe("preset");
  });
});
