import { type ComponentProps, useCallback, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./input";

type Props = ComponentProps<"textarea"> & {
  /** Height in rows when empty. The `rows` attribute is ignored in favour of this. */
  minRows?: number;
  /** The textarea scrolls only beyond this many rows; unlimited when omitted. */
  maxRows?: number;
};

// JS sizing instead of CSS `field-sizing: content`: WebKit (the macOS web view) does not
// support it everywhere yet, and this also gives us minRows/maxRows.
function fitHeight(el: HTMLTextAreaElement, minRows: number, maxRows: number | undefined) {
  const cs = getComputedStyle(el);
  const lineHeight = Number.parseFloat(cs.lineHeight) || Number.parseFloat(cs.fontSize) * 1.5 || 20;
  const chrome =
    Number.parseFloat(cs.paddingTop) +
    Number.parseFloat(cs.paddingBottom) +
    Number.parseFloat(cs.borderTopWidth) +
    Number.parseFloat(cs.borderBottomWidth);
  const min = minRows * lineHeight + chrome;
  const max = maxRows === undefined ? Number.POSITIVE_INFINITY : maxRows * lineHeight + chrome;
  el.style.height = "auto";
  const wanted = el.scrollHeight + (Number.parseFloat(cs.borderTopWidth) || 0) * 2;
  const height = Math.max(min, Math.min(wanted, max));
  el.style.height = `${height}px`;
  el.style.overflowY = wanted > max ? "auto" : "hidden";
}

function Textarea({ className, minRows = 2, maxRows, ref, onInput, ...props }: Props) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inner.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  const refit = useCallback(() => {
    if (inner.current) fitHeight(inner.current, minRows, maxRows);
  }, [minRows, maxRows]);

  // Runs after every render so programmatic value changes (AI insert, loading a draft) resize too.
  useLayoutEffect(refit);

  // Wrapping changes with the width, so refit when the element's width changes.
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        refit();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [refit]);

  return (
    <textarea
      data-slot="textarea"
      ref={setRefs}
      rows={minRows}
      className={cn("resize-none py-2", fieldClass, className)}
      onInput={(e) => {
        refit();
        onInput?.(e);
      }}
      {...props}
    />
  );
}

export { Textarea };
