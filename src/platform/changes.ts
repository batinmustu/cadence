import type { Database } from "./types";

const RELEVANT = /\b(posts|ideas|series)\b/i;

/** Wraps a database so `onWrite` fires after statements that touch posts, ideas or series. */
export function watchWrites(db: Database, onWrite: () => void): Database {
  const wrap = (inner: Database): Database => ({
    select: (sql, params) => inner.select(sql, params),
    async execute(sql, params) {
      await inner.execute(sql, params);
      if (RELEVANT.test(sql)) onWrite();
    },
    async transaction(fn) {
      const result = await inner.transaction((tx) => fn(wrap(tx)));
      return result;
    },
  });
  return wrap(db);
}
