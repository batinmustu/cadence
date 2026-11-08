import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLSpanElement> & { outlined?: boolean };

export function Chip({ outlined = false, className = "", ...rest }: Props) {
  const tone = outlined ? "border-border-strong" : "border-transparent bg-surface-2";
  return (
    <span
      className={`inline-flex h-6 items-center rounded-chip border px-2 text-xs text-text-2 ${tone} ${className}`}
      {...rest}
    />
  );
}
