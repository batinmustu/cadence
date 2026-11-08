import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import type { Database, Platform, ProviderId, SqlValue } from "../types";
import { createSqlJsDatabase } from "./sqljs";

// In-memory / no-op implementation used by `pnpm dev` and tests.
export function createBrowserPlatform(): Platform {
  const keys = new Set<ProviderId>();
  // Lazy: the wasm module loads on first query, so tests that never touch the
  // database stay fast.
  let real: Promise<Database> | undefined;
  const open = () => {
    real ??= createSqlJsDatabase(() => sqlWasmUrl);
    return real;
  };
  const database: Platform["database"] = {
    async select<T>(sql: string, params?: SqlValue[]) {
      return (await open()).select<T>(sql, params);
    },
    async execute(sql, params) {
      await (await open()).execute(sql, params);
    },
    async transaction(fn) {
      return (await open()).transaction(fn);
    },
  };
  return {
    database,
    secrets: {
      async setKey(provider) {
        keys.add(provider);
      },
      async hasKey(provider) {
        return keys.has(provider);
      },
      async clearKey(provider) {
        keys.delete(provider);
      },
    },
    ai: {
      async *complete() {
        yield "Mock AI response.";
      },
      async testConnection() {
        return true;
      },
    },
    window: {
      platform: "web",
      toggleSidebarShortcut: "Ctrl+B",
      onQuickCapture: () => () => {},
    },
    notifications: { async schedule() {}, async cancel() {} },
    clipboard: {
      async writeText(text) {
        await navigator.clipboard?.writeText(text);
      },
    },
  };
}
