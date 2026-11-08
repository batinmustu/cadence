import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-chip border px-3 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "border-transparent bg-primary text-primary-foreground hover:opacity-90",
        secondary: "border-input bg-transparent text-text-2 hover:bg-accent",
        ghost: "border-transparent bg-transparent text-text-3 hover:bg-accent",
        icon: "size-8 border-transparent bg-transparent px-0 text-text-3 hover:bg-accent",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, asChild = false, type = "button", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      {...(asChild ? {} : { type })}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export { Button, buttonVariants };
