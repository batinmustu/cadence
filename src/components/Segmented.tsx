import { useLayoutEffect, useRef, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type SegmentedOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

type Box = { left: number; width: number };

export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  const items = useRef(new Map<string, HTMLButtonElement>());
  const [box, setBox] = useState<Box | null>(null);

  // The indicator is positioned from the active item so it can slide between items.
  // biome-ignore lint/correctness/useExhaustiveDependencies: options (labels) can change the item widths
  useLayoutEffect(() => {
    const el = items.current.get(value);
    setBox(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
  }, [value, options]);

  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value}
      className="relative"
      // Radix reports "" when the active item is clicked again; keep the selection.
      onValueChange={(v) => v && onChange(v as T)}
    >
      {box ? (
        <span
          aria-hidden
          data-slot="segmented-indicator"
          className="absolute top-0.5 bottom-0.5 left-0 rounded-chip bg-muted transition-[transform,width] duration-[var(--motion-duration)] ease-[var(--motion-ease)]"
          style={{ width: box.width, transform: `translateX(${box.left}px)` }}
        />
      ) : null}
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="relative z-10"
          ref={(el) => {
            if (el) items.current.set(o.value, el);
            else items.current.delete(o.value);
          }}
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
