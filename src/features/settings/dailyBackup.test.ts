import { describe, expect, it, vi } from "vitest";
import type { Database, Files } from "../../platform/types";
import { runDailyBackup } from "./dailyBackup";

const files = (target: string | null): Files => ({
  saveExport: async () => null,
  revealDatabase: async () => {},
  backupTarget: vi.fn(async () => target),
});
const db = () => ({ execute: vi.fn(async () => {}) }) as unknown as Database;

describe("runDailyBackup", () => {
  it("copies the database to the planned target", async () => {
    const d = db();
    await runDailyBackup(d, files("/tmp/b/cadence-2026-11-08.db"), new Date(2026, 10, 8));
    expect(d.execute).toHaveBeenCalledWith("VACUUM INTO ?", ["/tmp/b/cadence-2026-11-08.db"]);
  });
  it("does nothing when today's backup exists", async () => {
    const d = db();
    await runDailyBackup(d, files(null));
    expect(d.execute).not.toHaveBeenCalled();
  });
  it("never throws", async () => {
    const d = { execute: async () => Promise.reject(new Error("x")) } as unknown as Database;
    await expect(runDailyBackup(d, files("/x.db"))).resolves.toBeUndefined();
  });
});
