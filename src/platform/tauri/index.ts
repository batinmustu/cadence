import { createBrowserPlatform } from "../browser";
import type { Platform } from "../types";
import { createTauriDatabase } from "./database";

// Only this folder may import @tauri-apps/*. Keychain and AI bindings arrive
// with issues #26 and #27; until then everything except the
// window info falls back to the in-memory implementation.
export function createTauriPlatform(): Platform {
  return {
    ...createBrowserPlatform(),
    database: createTauriDatabase(),
    window: { platform: "macos", toggleSidebarShortcut: "Ctrl+Cmd+S" },
  };
}
