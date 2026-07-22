"use client";

import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;
export const DialogPortal = D.Portal;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof D.Overlay>,
  React.ComponentPropsWithoutRef<typeof D.Overlay>
>(({ className, ...props }, ref) => (
  <D.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof D.Content>,
  React.ComponentPropsWithoutRef<typeof D.Content> & { hideClose?: boolean }
>(({ className, children, hideClose, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <D.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)] p-5 shadow-2xl rounded-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <D.Close className="absolute right-3 top-3 rounded-md p-1 text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-hover)]">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </D.Close>
      )}
    </D.Content>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col gap-1.5", className)}
    {...props}
  />
);

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof D.Title>,
  React.ComponentPropsWithoutRef<typeof D.Title>
>(({ className, ...props }, ref) => (
  <D.Title
    ref={ref}
    className={cn("text-[15px] font-semibold text-[color:var(--color-fg)]", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof D.Description>,
  React.ComponentPropsWithoutRef<typeof D.Description>
>(({ className, ...props }, ref) => (
  <D.Description
    ref={ref}
    className={cn("text-[13px] text-[color:var(--color-fg-dim)]", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";
