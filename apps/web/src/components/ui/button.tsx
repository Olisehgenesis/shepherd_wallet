import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-45 pixel-border bg-[var(--surface)] text-[var(--ink)]",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-white border-[var(--ink)] hover:brightness-95",
        ghost: "bg-[var(--surface)] hover:bg-[var(--surface-2)]",
        danger: "bg-[var(--danger)] text-white border-[var(--ink)]",
        outline: "bg-[var(--surface)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        lg: "h-12 px-5 text-base",
        sm: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
));
Button.displayName = "Button";
