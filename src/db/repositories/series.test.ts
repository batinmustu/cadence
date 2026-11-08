import { beforeEach, describe, expect, it } from "vitest";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import { prepareDatabase } from "../index";
import { PRESET_CONTENT_TYPES, PRESET_PLATFORMS } from "../seed/presets";
import { createIdeasRepository, type IdeasRepository } from "./ideas";
import { createPostsRepository, type PostsRepository } from "./posts";
import { createSeriesRepository, type SeriesRepository } from "./series";

const CT = PRESET_CONTENT_TYPES[0];
const PLATFORM = PRESET_PLATFORMS[0];
let repo: SeriesRepository;
let ideas: IdeasRepository;
let posts: PostsRepository;

beforeEach(async () => {
  const db = await createSqlJsDatabase();
  await prepareDatabase(db);
  let tick = 0;
  const clock = () => new Date(Date.UTC(2026, 10, 8, 10, 0, tick++));
  repo = createSeriesRepository(db, clock);
  ideas = createIdeasRepository(db, clock);
  posts = createPostsRepository(db, clock);
});

const make = (name = "Weekly tips") =>
  repo.create({
    name,
    platformId: PLATFORM?.id ?? "",
    weekdays: [7, 3, 3],
    anchorDate: "2026-11-01",
  });

describe("series repository", () => {
  it("creates with normalized weekdays and reads back", async () => {
    const s = await make();
    expect(s.weekdays).toEqual([0, 3]);
    expect(await repo.get(s.id)).toEqual(s);
  });
  it("updates fields", async () => {
    const s = await make();
    const next = await repo.update(s.id, {
      name: " Renamed ",
      time: "18:30",
      frequency: "monthly",
    });
    expect(next).toMatchObject({ name: "Renamed", time: "18:30", frequency: "monthly" });
    expect((await repo.get(s.id))?.time).toBe("18:30");
    expect(await repo.update("missing", { name: "x" })).toBeNull();
  });
  it("lists by name, hiding deleted series", async () => {
    const b = await make("B");
    await make("a");
    expect((await repo.list()).map((s) => s.name)).toEqual(["a", "B"]);
    await repo.softDelete(b.id);
    expect((await repo.list()).map((s) => s.name)).toEqual(["a"]);
  });
  it("assigns and unassigns ideas", async () => {
    const s = await make();
    const idea = await ideas.create({ title: "one" });
    await ideas.create({ title: "other" });
    await repo.assignIdea(idea.id, s.id);
    expect((await repo.listIdeas(s.id)).map((i) => i.id)).toEqual([idea.id]);
    await repo.assignIdea(idea.id, null);
    expect(await repo.listIdeas(s.id)).toEqual([]);
  });
  it("detaches ideas when the series is deleted", async () => {
    const s = await make();
    const idea = await ideas.create({ title: "one", seriesId: s.id });
    await repo.softDelete(s.id);
    expect((await ideas.get(idea.id))?.seriesId).toBeNull();
  });
  it("lists posts of the series, scheduled first", async () => {
    const s = await make();
    const idea = await ideas.create({ title: "one", seriesId: s.id });
    const outside = await ideas.create({ title: "out" });
    await posts.create({ ideaId: outside.id, contentTypeId: CT?.id ?? "" });
    const draft = await posts.create({ ideaId: idea.id, contentTypeId: CT?.id ?? "" });
    const sched = await posts.create({ ideaId: idea.id, contentTypeId: CT?.id ?? "" });
    await posts.update(sched.id, { status: "scheduled", scheduledAt: "2026-11-10T09:00:00.000Z" });
    expect((await repo.listPosts(s.id)).map((p) => p.id)).toEqual([sched.id, draft.id]);
    expect(await repo.listSlotPosts(s.id)).toEqual([
      { id: sched.id, scheduledAt: "2026-11-10T09:00:00.000Z" },
      { id: draft.id, scheduledAt: null },
    ]);
  });
});
