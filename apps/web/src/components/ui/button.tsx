import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-ctl)] text-[13px] font-normal transition-[filter,background-color,border-color] duration-150 ease-out focus-visible:outline-[2px] focus-visible:outline-[var(--focus)] focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-[var(--accent-ink)] border border-transparent hover:brightness-110",
        ghost: "bg-transparent text-[var(--ink)] border-0 hover:bg-[var(--accent-soft)]",
        danger: "bg-[var(--danger)] text-white border border-transparent",
        outline: "bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--accent-soft)]",
        brand: "bg-[var(--band)] text-white border border-transparent hover:brightness-110",
      },
      size: {
        default: "h-9 px-3 py-2",
        lg: "h-10 px-4 text-[14px]",
        sm: "h-8 px-2.5 text-[12px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
