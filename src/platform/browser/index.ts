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
      async *complete(request) {
        // Honours the options contract so option cards are testable in the browser.
        if (request.system.includes('{"options"')) {
          yield '{"options": ["Mock option one", "Mock option two"]}';
          return;
        }
        yield "Mock AI ";
        yield "response.";
      },
      async testConnection() {
        return true;
      },
    },
    window: {
      platform: "web",
      toggleSidebarShortcut: "Ctrl+B",
      onQuickCapture: () => () => {},
      async setQuickCaptureShortcut() {},
    },
    notifications: { async schedule() {}, async cancel() {} },
    files: {
      async saveExport(fileName, content) {
        const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return null;
      },
      async revealDatabase() {},
      async backupTarget() {
        return null;
      },
    },
    clipboard: {
      async writeText(text) {
        await navigator.clipboard?.writeText(text);
      },
    },
  };
}
