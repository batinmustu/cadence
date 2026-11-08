import { useCallback, useEffect, useMemo, useState } from "react";
import { matchesShortcut } from "../../core/shortcut";
import { createSettingsRepository } from "../../db/repositories/settings";
import { platform } from "../../platform";

const KEY = "sidebar.collapsed";

/** Collapsed state is persisted in the settings table and toggled by the platform shortcut. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const settings = useMemo(() => createSettingsRepository(platform.database), []);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    settings
      .get(KEY)
      .then((v) => setCollapsed(v === "true"))
      .catch(() => {
        // Falling back to expanded is harmless.
      });
  }, [settings]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      settings.set(KEY, String(next)).catch(() => {});
      return next;
    });
  }, [settings]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (matchesShortcut(e, platform.window.toggleSidebarShortcut)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return [collapsed, toggle];
}
