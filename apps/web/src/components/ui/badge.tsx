import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-ctl)] border px-2 py-0.5 text-[11px] font-normal",
  {
    variants: {
      variant: {
        default: "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]",
        ok: "border-transparent bg-[var(--ok-bg)] text-[var(--ok)]",
        bad: "border-transparent bg-[var(--danger-bg)] text-[var(--danger)]",
        wait: "border-transparent bg-[var(--wait-bg)] text-[var(--wait)]",
        info: "border-transparent bg-[var(--info-bg)] text-[var(--info)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
