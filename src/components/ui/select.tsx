import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./input";

// Native select for now; issue #85 replaces it with the shadcn Select.
function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn("h-9 cursor-pointer", fieldClass, className)}
      {...props}
    />
  );
}

export { Select };
