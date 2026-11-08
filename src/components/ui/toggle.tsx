import * as TogglePrimitive from "@radix-ui/react-toggle";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Toggle({ className, ...props }: ComponentProps<typeof TogglePrimitive.Root>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(
        "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-chip border border-input px-2.5 text-xs text-text-3 outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:border-border-strong data-[state=on]:bg-accent data-[state=on]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Toggle };
