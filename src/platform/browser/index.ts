import type { Platform, ProviderId, SqlValue } from "../types";

// In-memory / no-op implementation used by `pnpm dev` and tests.
export function createBrowserPlatform(): Platform {
  const keys = new Set<ProviderId>();
  const database: Platform["database"] = {
    async select<T>(_sql: string, _params?: SqlValue[]) {
      return [] as T[];
    },
    async execute() {},
    async transaction(fn) {
      return fn(database);
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
    window: { platform: "web", toggleSidebarShortcut: "Ctrl+B" },
    notifications: { async schedule() {}, async cancel() {} },
    clipboard: {
      async writeText(text) {
        await navigator.clipboard?.writeText(text);
      },
    },
  };
}
