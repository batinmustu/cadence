import { listen } from "@tauri-apps/api/event";
import { createBrowserPlatform } from "../browser";
import type { Platform } from "../types";
import { createTauriDatabase } from "./database";
import { createTauriNotifications } from "./notifications";

// Only this folder may import @tauri-apps/*. Keychain and AI bindings arrive
// with issues #26 and #27; until then everything except the
// window info falls back to the in-memory implementation.
export function createTauriPlatform(): Platform {
  return {
    ...createBrowserPlatform(),
    database: createTauriDatabase(),
    notifications: createTauriNotifications(),
    window: {
      platform: "macos",
      toggleSidebarShortcut: "Ctrl+Cmd+S",
      onQuickCapture(listener) {
        // listen() resolves asynchronously; unsubscribe once it does if we were already torn down.
        let off: (() => void) | null = null;
        let closed = false;
        void listen("quick-capture", listener).then((fn) => {
          if (closed) fn();
          else off = fn;
        });
        return () => {
          closed = true;
          off?.();
        };
      },
    },
  };
}
