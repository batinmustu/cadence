import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full rounded-row border border-input bg-card px-3 text-foreground placeholder:text-text-4 focus:border-border-strong focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

function Input({ className, ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={cn("h-9", fieldClass, className)} {...props} />;
}

export { Input };
