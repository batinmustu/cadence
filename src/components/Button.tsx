import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-text text-bg border-transparent hover:opacity-90",
  secondary: "bg-transparent text-text-2 border-border-input hover:bg-surface-2",
  ghost: "bg-transparent text-text-3 border-transparent hover:bg-surface-2",
  icon: "bg-transparent text-text-3 border-transparent hover:bg-surface-2 size-8 px-0",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant = "secondary", className = "", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex h-8 items-center justify-center gap-2 rounded-chip border px-3 text-[13px] font-medium disabled:opacity-40 ${variants[variant]} ${className}`}
      {...rest}
    />
  );
}
