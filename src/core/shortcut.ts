export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** Matches strings such as "Ctrl+Cmd+S" or "Ctrl+B" against a keyboard event. */
export function matchesShortcut(event: KeyLike, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));
  return (
    event.key.toLowerCase() === key &&
    event.ctrlKey === mods.has("ctrl") &&
    event.metaKey === (mods.has("cmd") || mods.has("meta")) &&
    event.altKey === (mods.has("alt") || mods.has("opt")) &&
    event.shiftKey === mods.has("shift")
  );
}
