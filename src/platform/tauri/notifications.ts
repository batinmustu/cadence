import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { Notifications } from "../types";

/**
 * Desktop has no persistent scheduler in the plugin, so reminders are in-process timers.
 * They are re-planned on every launch, which is why the app only plans a short horizon.
 */
export function createTauriNotifications(): Notifications {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  async function allowed(): Promise<boolean> {
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  }

  return {
    async schedule(n) {
      const existing = timers.get(n.id);
      if (existing) clearTimeout(existing);
      const delay = new Date(n.at).getTime() - Date.now();
      // setTimeout overflows past ~24.8 days; the planner never goes that far.
      if (delay <= 0 || delay > 2_147_483_647) return;
      timers.set(
        n.id,
        setTimeout(() => {
          timers.delete(n.id);
          void allowed()
            .then((ok) => {
              if (ok) sendNotification({ title: n.title, body: n.body });
            })
            .catch(() => {});
        }, delay),
      );
    },
    async cancel(id) {
      const t = timers.get(id);
      if (t) clearTimeout(t);
      timers.delete(id);
    },
  };
}
