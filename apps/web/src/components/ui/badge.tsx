import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center px-2 py-0.5 text-[10px] font-semibold pixel-border bg-[var(--surface)]", {
  variants: {
    variant: {
      default: "text-[var(--ink)]",
      ok: "bg-[var(--ok-bg)] text-[var(--ok)] border-[var(--ok)]",
      bad: "bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]",
      wait: "bg-[var(--wait-bg)] text-[var(--wait)] border-[var(--wait)]",
      info: "bg-[var(--info-bg)] text-[var(--info)] border-[var(--info)]",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
