import { useEffect, useRef } from "react";
import { platform } from "../../platform";

/**
 * Mouse handler for title-bar rows: dragging empty space moves the window, a double click
 * maximises it. Presses on child controls are ignored so buttons stay clickable.
 */
export function onTitleBarMouseDown(
  e: Pick<MouseEvent, "button" | "detail" | "target" | "currentTarget">,
) {
  if (e.button !== 0 || e.target !== e.currentTarget) return;
  if (e.detail === 2) void platform.window.toggleMaximize();
  else void platform.window.startDragging();
}

/** Ref for a title-bar row; attaches the drag handler as a DOM listener (the row is not a control). */
export function useTitleBarDrag<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("mousedown", onTitleBarMouseDown);
    return () => el.removeEventListener("mousedown", onTitleBarMouseDown);
  }, []);
  return ref;
}
