import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  active?: boolean;
}

export function IconButton({ label, children, active, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full text-muted transition-colors",
        "hover:bg-surface hover:text-ink disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-2 focus-visible:outline-brand",
        active && "text-brand",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
