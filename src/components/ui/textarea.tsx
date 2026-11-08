import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./input";

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn("min-h-20 py-2", fieldClass, className)}
      {...props}
    />
  );
}

export { Textarea };
