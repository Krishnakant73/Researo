"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[64px] w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-2 text-[13px]",
      "text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)]",
      "focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent-soft)]",
      "resize-none transition-colors",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
