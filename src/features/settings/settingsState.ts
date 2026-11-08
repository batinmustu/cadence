import { useSyncExternalStore } from "react";

export const SETTINGS_SECTIONS = ["general", "ai", "platforms", "tags", "data"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

type State = { open: boolean; section: SettingsSection };

// Module-level store so any code (sidebar, palette, shortcuts) can open
// settings without prop drilling. The section survives close/open.
let state: State = { open: false, section: "general" };
const listeners = new Set<() => void>();

function set(next: State): void {
  state = next;
  for (const l of listeners) l();
}

export function openSettings(section?: SettingsSection): void {
  set({ open: true, section: section ?? state.section });
}

export function closeSettings(): void {
  set({ ...state, open: false });
}

export function setSettingsSection(section: SettingsSection): void {
  set({ ...state, section });
}

export function useSettingsDialog(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
