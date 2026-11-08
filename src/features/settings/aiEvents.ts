// The sidebar status row and the settings screen are far apart in the tree.
const listeners = new Set<() => void>();

export function notifyAiSettingsChanged(): void {
  for (const l of listeners) l();
}

export function onAiSettingsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
