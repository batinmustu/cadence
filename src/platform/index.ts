import { createBrowserPlatform } from "./browser";
import { watchWrites } from "./changes";
import { createTauriPlatform } from "./tauri";
import type { Platform } from "./types";

// Tauri injects this global into its web view; plain browsers do not have it.
const insideTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const writeListeners = new Set<() => void>();

/** Fires after any write to posts, ideas or series, wherever in the app it happens. */
export function onContentWritten(listener: () => void): () => void {
  writeListeners.add(listener);
  return () => writeListeners.delete(listener);
}

const base = insideTauri ? createTauriPlatform() : createBrowserPlatform();

export const platform: Platform = {
  ...base,
  database: watchWrites(base.database, () => {
    for (const l of writeListeners) l();
  }),
};
