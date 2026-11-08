import { createBrowserPlatform } from "./browser";
import { createTauriPlatform } from "./tauri";
import type { Platform } from "./types";

// Tauri injects this global into its web view; plain browsers do not have it.
const insideTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const platform: Platform = insideTauri ? createTauriPlatform() : createBrowserPlatform();
