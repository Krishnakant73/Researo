"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-all disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[color:var(--color-accent)] text-white hover:bg-[color:var(--color-accent-strong)] shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_6px_20px_-8px_rgba(124,92,255,0.6)]",
        secondary:
          "bg-[color:var(--color-bg-elev)] text-[color:var(--color-fg)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-hover)] hover:border-[color:var(--color-border-strong)]",
        ghost:
          "text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-hover)]",
        outline:
          "border border-[color:var(--color-border-strong)] text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-hover)]",
        danger:
          "bg-[color:var(--color-danger)] text-white hover:brightness-110",
        subtle:
          "bg-[rgba(255,255,255,0.04)] text-[color:var(--color-fg-dim)] border border-[color:var(--color-border)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[color:var(--color-fg)]",
      },
      size: {
        sm: "h-7 px-2.5 text-[12px]",
        md: "h-8 px-3",
        lg: "h-10 px-4 text-[14px]",
        icon: "h-8 w-8",
        iconSm: "h-7 w-7",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
