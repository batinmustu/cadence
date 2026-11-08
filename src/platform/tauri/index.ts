import { createBrowserPlatform } from "../browser";
import type { Platform } from "../types";

// Only this folder may import @tauri-apps/*. Real database, keychain and AI
// bindings arrive with issues #6, #26 and #27; until then everything except the
// window info falls back to the in-memory implementation.
export function createTauriPlatform(): Platform {
  return {
    ...createBrowserPlatform(),
    window: { platform: "macos", toggleSidebarShortcut: "Ctrl+Cmd+S" },
  };
}
