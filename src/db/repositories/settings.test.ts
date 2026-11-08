import { beforeEach, describe, expect, it } from "vitest";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import { prepareDatabase } from "../index";
import { createSettingsRepository, type SettingsRepository } from "./settings";

let repo: SettingsRepository;
beforeEach(async () => {
  const db = await createSqlJsDatabase();
  await prepareDatabase(db);
  repo = createSettingsRepository(db);
});

describe("settings repository", () => {
  it("returns null for unknown keys", async () => {
    expect(await repo.get("nope")).toBeNull();
  });
  it("upserts values", async () => {
    await repo.set("sidebar.collapsed", "true");
    await repo.set("sidebar.collapsed", "false");
    expect(await repo.get("sidebar.collapsed")).toBe("false");
  });
});
