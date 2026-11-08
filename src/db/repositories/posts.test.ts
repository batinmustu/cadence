import { beforeEach, describe, expect, it } from "vitest";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { Database } from "../../platform/types";
import { prepareDatabase } from "../index";
import { PRESET_CONTENT_TYPES } from "../seed/presets";
import { createIdeasRepository, type IdeasRepository } from "./ideas";
import { createPostsRepository, type PostsRepository } from "./posts";

const CT = PRESET_CONTENT_TYPES[0].id;
let db: Database;
let ideas: IdeasRepository;
let posts: PostsRepository;
let tick = 0;

beforeEach(async () => {
  db = await createSqlJsDatabase();
  await prepareDatabase(db);
  tick = 0;
  const clock = () => new Date(Date.UTC(2026, 10, 8, 10, 0, tick++));
  ideas = createIdeasRepository(db, clock);
  posts = createPostsRepository(db, clock);
});

const statusOf = async (id: string) => (await ideas.get(id))?.status;

describe("posts repository", () => {
  it("creates, reads and lists posts by idea (excluding deleted)", async () => {
    const idea = await ideas.create({ title: "A" });
    const a = await posts.create({ ideaId: idea.id, contentTypeId: CT, fields: { text: ["hi"] } });
    const b = await posts.create({ ideaId: idea.id, contentTypeId: CT });
    expect((await posts.get(a.id))?.fields).toEqual({ text: ["hi"] });
    expect((await posts.listByIdea(idea.id)).map((p) => p.id)).toEqual([a.id, b.id]);
    await posts.softDelete(b.id);
    expect((await posts.listByIdea(idea.id)).map((p) => p.id)).toEqual([a.id]);
    expect((await posts.get(b.id))?.deletedAt).not.toBeNull();
  });

  it("updates fields and returns null for missing or deleted posts", async () => {
    const idea = await ideas.create({ title: "A" });
    const p = await posts.create({ ideaId: idea.id, contentTypeId: CT });
    const u = await posts.update(p.id, { fields: { text: ["x"] }, afterNote: "n" });
    expect(u?.afterNote).toBe("n");
    expect((await posts.get(p.id))?.fields).toEqual({ text: ["x"] });
    expect(await posts.update("missing", {})).toBeNull();
    await posts.softDelete(p.id);
    expect(await posts.update(p.id, {})).toBeNull();
  });

  it("derives the idea status from its posts", async () => {
    const idea = await ideas.create({ title: "A" });
    expect(await statusOf(idea.id)).toBe("idea");
    const p1 = await posts.create({ ideaId: idea.id, contentTypeId: CT });
    expect(await statusOf(idea.id)).toBe("draft");
    const p2 = await posts.create({ ideaId: idea.id, contentTypeId: CT });
    await posts.update(p1.id, { status: "scheduled", scheduledAt: "2026-11-10T09:00:00.000Z" });
    expect(await statusOf(idea.id)).toBe("planned");
    await posts.update(p1.id, { status: "published" });
    expect(await statusOf(idea.id)).toBe("draft");
    await posts.update(p2.id, { status: "published" });
    expect(await statusOf(idea.id)).toBe("published");
    await posts.softDelete(p2.id);
    expect(await statusOf(idea.id)).toBe("published");
    await posts.softDelete(p1.id);
    expect(await statusOf(idea.id)).toBe("idea");
  });

  it("never overrides archived", async () => {
    const idea = await ideas.create({ title: "A" });
    await ideas.update(idea.id, { status: "archived" });
    await posts.create({ ideaId: idea.id, contentTypeId: CT });
    expect(await statusOf(idea.id)).toBe("archived");
  });

  it("lists scheduled posts in a half-open date range, earliest first", async () => {
    const idea = await ideas.create({ title: "A" });
    const mk = async (at: string) => {
      const p = await posts.create({ ideaId: idea.id, contentTypeId: CT });
      await posts.update(p.id, { status: "scheduled", scheduledAt: at });
      return p.id;
    };
    const late = await mk("2026-11-12T09:00:00.000Z");
    const early = await mk("2026-11-10T09:00:00.000Z");
    await mk("2026-11-20T09:00:00.000Z");
    const draft = await posts.create({ ideaId: idea.id, contentTypeId: CT });
    const got = await posts.listScheduled("2026-11-10T09:00:00.000Z", "2026-11-13T00:00:00.000Z");
    expect(got.map((p) => p.id)).toEqual([early, late]);
    expect(got.map((p) => p.id)).not.toContain(draft.id);
  });
});
