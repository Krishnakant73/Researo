"use client";
import * as React from "react";
import * as S from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = S.Root;
export const SelectValue = S.Value;
export const SelectGroup = S.Group;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof S.Trigger>,
  React.ComponentPropsWithoutRef<typeof S.Trigger>
>(({ className, children, ...props }, ref) => (
  <S.Trigger
    ref={ref}
    className={cn(
      "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-2.5 text-[12px] text-[color:var(--color-fg)] hover:border-[color:var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent-soft)]",
      className
    )}
    {...props}
  >
    {children}
    <S.Icon asChild>
      <ChevronDown className="h-3.5 w-3.5 text-[color:var(--color-fg-muted)]" />
    </S.Icon>
  </S.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof S.Content>,
  React.ComponentPropsWithoutRef<typeof S.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <S.Portal>
    <S.Content
      ref={ref}
      position={position}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)] shadow-xl",
        position === "popper" && "translate-y-1",
        className
      )}
      {...props}
    >
      <S.Viewport className="p-1">{children}</S.Viewport>
    </S.Content>
  </S.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof S.Item>,
  React.ComponentPropsWithoutRef<typeof S.Item>
>(({ className, children, ...props }, ref) => (
  <S.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-[12px] outline-none data-[highlighted]:bg-[color:var(--color-bg-hover)] data-[state=checked]:text-[color:var(--color-accent)]",
      className
    )}
    {...props}
  >
    <S.ItemText>{children}</S.ItemText>
    <S.ItemIndicator className="ml-auto">
      <Check className="h-3.5 w-3.5" />
    </S.ItemIndicator>
  </S.Item>
));
SelectItem.displayName = "SelectItem";
