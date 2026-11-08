import { beforeEach, describe, expect, it } from "vitest";
import { buildPrompt } from "../../core/prompt";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { Database } from "../../platform/types";
import { prepareDatabase } from "../index";
import { PRESET_COMMANDS } from "../seed/commands";
import { type CommandsRepository, createCommandsRepository } from "./commands";

let db: Database;
let repo: CommandsRepository;
beforeEach(async () => {
  db = await createSqlJsDatabase();
  await prepareDatabase(db);
  repo = createCommandsRepository(db);
});

describe("preset commands", () => {
  it("seeds the eight presets in order", async () => {
    const list = await repo.list();
    expect(list.map((c) => c.name)).toEqual([
      "Split into thread",
      "Shorten",
      "Suggest hooks",
      "Apply my tone",
      "Adapt to another platform",
      "Suggest titles",
      "Expand script",
      "Write description",
    ]);
    expect(list.every((c) => c.isPreset)).toBe(true);
    expect(list.filter((c) => c.returnsOptions).map((c) => c.name)).toEqual([
      "Suggest hooks",
      "Suggest titles",
    ]);
  });

  it("does not bring back a deleted preset on the next start", async () => {
    const [first] = await repo.list();
    await repo.remove(first?.id ?? "");
    await prepareDatabase(db);
    expect((await repo.list()).length).toBe(7);
  });

  it("builds a stable prompt for each preset (snapshot)", () => {
    const built = PRESET_COMMANDS.map((c) =>
      buildPrompt({ commandPrompt: c.prompt, expectsOptions: c.returnsOptions }),
    );
    expect(built).toMatchSnapshot();
  });
});

describe("commands repository", () => {
  it("creates, edits and deletes a custom command", async () => {
    const c = await repo.create({
      name: " Punchier ",
      prompt: "Make it punchier",
      contentTypeId: null,
      returnsOptions: false,
    });
    expect(c.name).toBe("Punchier");
    expect(c.isPreset).toBe(false);
    expect(c.sortOrder).toBe(8);
    await repo.update(c.id, {
      name: "Punchy",
      prompt: "Punchier!",
      contentTypeId: PRESET_COMMANDS[0]?.contentTypeId ?? null,
      returnsOptions: true,
    });
    const found = (await repo.list()).find((x) => x.id === c.id);
    expect(found).toMatchObject({ name: "Punchy", returnsOptions: true });
    expect(found?.contentTypeId).not.toBeNull();
    await repo.remove(c.id);
    expect((await repo.list()).some((x) => x.id === c.id)).toBe(false);
  });

  it("rejects an empty name", async () => {
    await expect(
      repo.create({ name: " ", prompt: "x", contentTypeId: null, returnsOptions: false }),
    ).rejects.toThrow();
  });
});
