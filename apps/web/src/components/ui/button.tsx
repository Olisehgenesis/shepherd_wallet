import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold transition-[filter,transform,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--forest)] disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--forest)] text-white border border-transparent hover:brightness-[1.05] active:translate-y-px shadow-[0_8px_20px_color-mix(in_srgb,var(--forest)_22%,transparent)]",
        ghost: "bg-transparent text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--surface)]",
        danger: "bg-[var(--danger)] text-white border border-transparent",
        outline: "bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--surface-2)]",
      },
      size: {
        default: "h-11 px-5 py-2",
        lg: "h-12 px-6 text-[15px]",
        sm: "h-9 px-4 text-xs",
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
