import type { ReactNode } from "react";

type Props = { pressed: boolean; onChange: (pressed: boolean) => void; children: ReactNode };

export function ToggleChip({ pressed, onChange, children }: Props) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={`inline-flex h-7 items-center gap-1.5 rounded-chip border px-2.5 text-xs ${
        pressed
          ? "border-border-strong bg-surface-2 text-text"
          : "border-border-input text-text-3 hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}
