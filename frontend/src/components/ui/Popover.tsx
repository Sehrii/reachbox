"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useClickOutside } from "@/hooks/useClickOutside";

interface PopoverProps {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  /** Controlled mode (optional). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  panelClassName?: string;
}

export function Popover({ trigger, children, align = "start", open, onOpenChange, className, panelClassName }: PopoverProps) {
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const ref = useRef<HTMLDivElement>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      setInnerOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);
  useClickOutside(ref, close, isOpen);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {trigger({ open: isOpen, toggle: () => setOpen(!isOpen) })}
      {isOpen && (
        <div
          role="dialog"
          className={cn(
            "absolute top-full z-30 mt-2 min-w-48 rounded-xl border border-line bg-white p-1.5 shadow-lg shadow-black/5",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}
