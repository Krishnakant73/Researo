"use client";
import * as React from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DM.Content>,
  React.ComponentPropsWithoutRef<typeof DM.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DM.Portal>
    <DM.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[10rem] overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)] p-1 shadow-xl",
        className
      )}
      {...props}
    />
  </DM.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DM.Item>,
  React.ComponentPropsWithoutRef<typeof DM.Item>
>(({ className, ...props }, ref) => (
  <DM.Item
    ref={ref}
    className={cn(
      "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none data-[highlighted]:bg-[color:var(--color-bg-hover)]",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = ({ className }: { className?: string }) => (
  <DM.Separator className={cn("my-1 h-px bg-[color:var(--color-border)]", className)} />
);

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DM.Label>,
  React.ComponentPropsWithoutRef<typeof DM.Label>
>(({ className, ...props }, ref) => (
  <DM.Label
    ref={ref}
    className={cn("px-2 py-1 text-[10px] uppercase tracking-wide text-[color:var(--color-fg-muted)]", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";
