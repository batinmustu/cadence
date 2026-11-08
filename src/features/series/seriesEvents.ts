// Series are listed in the sidebar and in the capture box, which live far apart
// in the tree; a tiny change signal keeps both fresh without a shared store.
const listeners = new Set<() => void>();

export function notifySeriesChanged(): void {
  for (const l of listeners) l();
}

export function onSeriesChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
