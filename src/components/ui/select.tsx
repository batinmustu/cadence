import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Radix items cannot have an empty value, but "no selection" ("") is a real
// choice in several forms, so it is mapped to a sentinel.
const EMPTY = "__empty__";
const toRadix = (v: string) => (v === "" ? EMPTY : v);
const fromRadix = (v: string) => (v === EMPTY ? "" : v);

type OptionProps = { value: string; children?: ReactNode; disabled?: boolean };

export type SelectProps = {
  id?: string;
  "aria-label"?: string;
  className?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  /** `<option value="…">Label</option>` elements, as with a native select. */
  children: ReactNode;
};

function Select({
  className,
  children,
  value,
  defaultValue,
  onValueChange,
  disabled,
  id,
  "aria-label": ariaLabel,
}: SelectProps) {
  const options = Children.toArray(children).filter(
    (c): c is ReactElement<OptionProps> => isValidElement(c) && c.type === "option",
  );
  return (
    <SelectPrimitive.Root
      value={value === undefined ? undefined : toRadix(value)}
      defaultValue={defaultValue === undefined ? undefined : toRadix(defaultValue)}
      onValueChange={(v) => onValueChange?.(fromRadix(v))}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        data-slot="select"
        className={cn(
          "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-row border border-input bg-card px-3 text-left text-foreground focus:border-border-strong focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-text-4",
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-text-3" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-[100] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-row border border-border-strong bg-surface text-foreground shadow-lg"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.props.value}
                value={toRadix(o.props.value)}
                disabled={o.props.disabled}
                className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-card"
              >
                <SelectPrimitive.ItemText>{o.props.children}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2">
                  <Check className="size-4" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
