import type { ComponentProps } from "react";

const field =
  "w-full rounded-row border border-border-input bg-surface px-3 text-text placeholder:text-text-4 focus:border-border-strong focus:outline-none";

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`h-9 ${field} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea className={`min-h-20 py-2 ${field} ${className}`} {...rest} />;
}

export function Select({ className = "", ...rest }: ComponentProps<"select">) {
  return <select className={`h-9 ${field} ${className}`} {...rest} />;
}
