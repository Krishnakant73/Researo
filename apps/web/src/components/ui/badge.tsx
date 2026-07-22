import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] font-medium",
  {
    variants: {
      tone: {
        neutral:
          "bg-white/[0.04] border-white/[0.08] text-[color:var(--color-fg-dim)]",
        accent:
          "bg-[color:var(--color-accent-soft)] border-[rgba(124,92,255,0.3)] text-[#c9bcff]",
        success:
          "bg-[rgba(35,192,105,0.12)] border-[rgba(35,192,105,0.3)] text-[#6fe0a1]",
        warn: "bg-[rgba(242,176,74,0.12)] border-[rgba(242,176,74,0.3)] text-[#f5c37a]",
        danger:
          "bg-[rgba(239,74,92,0.12)] border-[rgba(239,74,92,0.35)] text-[#ff8894]",
        cyan: "bg-[rgba(77,208,255,0.10)] border-[rgba(77,208,255,0.30)] text-[#8fdcff]",
        pink: "bg-[rgba(255,119,176,0.10)] border-[rgba(255,119,176,0.30)] text-[#ffa6cb]",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
