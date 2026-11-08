import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type SegmentedOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value}
      // Radix reports "" when the active item is clicked again; keep the selection.
      onValueChange={(v) => v && onChange(v as T)}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value}>
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
