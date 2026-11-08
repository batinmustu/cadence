export type SegmentedOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <fieldset className="m-0 inline-flex rounded-row border-0 bg-surface p-0.5">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`h-7 rounded-chip px-3 text-[13px] ${
            o.value === value ? "bg-surface-3 text-text" : "text-text-3"
          }`}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}
