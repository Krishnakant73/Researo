"use client";

import * as React from "react";
import * as T from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof T.List>,
  React.ComponentPropsWithoutRef<typeof T.List>
>(({ className, ...props }, ref) => (
  <T.List
    ref={ref}
    className={cn(
      "inline-flex h-8 items-center gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-1",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof T.Trigger>,
  React.ComponentPropsWithoutRef<typeof T.Trigger>
>(({ className, ...props }, ref) => (
  <T.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium text-[color:var(--color-fg-dim)] transition-colors",
      "hover:text-[color:var(--color-fg)]",
      "data-[state=active]:bg-[color:var(--color-bg-hover)] data-[state=active]:text-[color:var(--color-fg)] data-[state=active]:shadow-inner",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof T.Content>,
  React.ComponentPropsWithoutRef<typeof T.Content>
>(({ className, ...props }, ref) => (
  <T.Content
    ref={ref}
    className={cn("focus:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
