import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createBrowserPlatform } from "../browser";
import type { Platform } from "../types";
import { createTauriAI } from "./ai";
import { createTauriDatabase } from "./database";
import { createTauriNotifications } from "./notifications";
import { createTauriSecrets } from "./secrets";

// Only this folder may import @tauri-apps/*. Keychain and AI bindings arrive
// with issues #26 and #27; until then everything except the
// window info falls back to the in-memory implementation.
export function createTauriPlatform(): Platform {
  return {
    ...createBrowserPlatform(),
    database: createTauriDatabase(),
    notifications: createTauriNotifications(),
    secrets: createTauriSecrets(),
    ai: createTauriAI(),
    files: {
      saveExport: (fileName, content) => invoke<string>("save_export", { fileName, content }),
      async revealDatabase() {
        await invoke("reveal_database");
      },
      backupTarget: (fileName) => invoke<string | null>("backup_target", { fileName }),
    },
    window: {
      platform: "macos",
      isFullscreen: () => getCurrentWindow().isFullscreen(),
      onFullscreenChange(listener) {
        // Entering/leaving full screen resizes the window; re-read the state on every resize.
        let off: (() => void) | null = null;
        let closed = false;
        void getCurrentWindow()
          .onResized(() => {
            void getCurrentWindow().isFullscreen().then(listener);
          })
          .then((fn) => {
            if (closed) fn();
            else off = fn;
          });
        return () => {
          closed = true;
          off?.();
        };
      },
      async setQuickCaptureShortcut(accelerator) {
        await invoke("set_capture_shortcut", { accelerator });
      },
      async startDragging() {
        await getCurrentWindow().startDragging();
      },
      async toggleMaximize() {
        await getCurrentWindow().toggleMaximize();
      },
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
