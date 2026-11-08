import { describe, expect, it, vi } from "vitest";
import { watchWrites } from "./changes";
import type { Database } from "./types";

const fake = (): Database => {
  const db: Database = {
    select: async () => [],
    execute: async () => {},
    transaction: async (fn) => fn(db),
  };
  return db;
};

describe("watchWrites", () => {
  it("fires for relevant writes, also inside transactions", async () => {
    const spy = vi.fn();
    const db = watchWrites(fake(), spy);
    await db.execute("UPDATE tags SET name = ?");
    expect(spy).not.toHaveBeenCalled();
    await db.execute("UPDATE posts SET status = ?");
    await db.transaction((tx) => tx.execute("INSERT INTO series (id) VALUES (?)"));
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
