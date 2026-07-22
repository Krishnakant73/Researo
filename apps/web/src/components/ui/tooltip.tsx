"use client";

import * as React from "react";
import * as TP from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TP.Provider;
export const Tooltip = TP.Root;
export const TooltipTrigger = TP.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TP.Content>,
  React.ComponentPropsWithoutRef<typeof TP.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TP.Portal>
    <TP.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-md border border-[color:var(--color-border)] bg-[#0d0e11] px-2 py-1 text-[11px] text-[color:var(--color-fg)] shadow-lg",
        "data-[state=delayed-open]:animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    />
  </TP.Portal>
));
TooltipContent.displayName = "TooltipContent";
