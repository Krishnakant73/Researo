"use client";
import * as React from "react";
import * as Sw from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof Sw.Root>,
  React.ComponentPropsWithoutRef<typeof Sw.Root>
>(({ className, ...props }, ref) => (
  <Sw.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
      "data-[state=unchecked]:bg-white/[0.08] data-[state=checked]:bg-[color:var(--color-accent)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-soft)]",
      className
    )}
    {...props}
  >
    <Sw.Thumb className="pointer-events-none block h-3 w-3 rounded-full bg-white shadow-md transition-transform data-[state=checked]:translate-x-3.5 data-[state=unchecked]:translate-x-0.5" />
  </Sw.Root>
));
Switch.displayName = "Switch";
