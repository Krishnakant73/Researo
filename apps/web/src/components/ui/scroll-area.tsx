"use client";
import * as React from "react";
import * as SA from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";

export const ScrollArea = React.forwardRef<
  React.ElementRef<typeof SA.Root>,
  React.ComponentPropsWithoutRef<typeof SA.Root>
>(({ className, children, ...props }, ref) => (
  <SA.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <SA.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </SA.Viewport>
    <SA.Scrollbar
      orientation="vertical"
      className="flex touch-none select-none p-0.5 transition-colors w-2"
    >
      <SA.Thumb className="relative flex-1 rounded-full bg-white/[0.08] hover:bg-white/[0.14]" />
    </SA.Scrollbar>
  </SA.Root>
));
ScrollArea.displayName = "ScrollArea";
