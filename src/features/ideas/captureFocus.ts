// Quick capture can be requested before the capture box exists (the app may
// be on another screen), so a request stays pending until a box consumes it.
let pending = false;
const listeners = new Set<() => void>();

export function requestCaptureFocus(): void {
  pending = true;
  for (const l of listeners) l();
}

/** Returns true once per request. */
export function consumeCaptureFocus(): boolean {
  const was = pending;
  pending = false;
  return was;
}

export function onCaptureFocusRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
