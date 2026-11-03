import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "filled" | "bare" | "boxed";

const variants: Record<Variant, string> = {
  /** Gray block input (login form, search). */
  filled: "w-full h-11 rounded-lg bg-surface px-3.5 placeholder:text-muted focus:ring-2 focus:ring-brand/30",
  /** Borderless input inside a labelled row (compose To/Subject). */
  bare: "w-full h-9 bg-transparent placeholder:text-muted/80",
  /** Small bordered numeric box (delay / hourly limit). */
  boxed: "h-8 w-16 rounded-md border border-line px-2.5 placeholder:text-muted/70 focus:border-brand",
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: Variant;
}

export function Input({ variant = "filled", className, ...rest }: InputProps) {
  return <input className={cn("text-sm text-ink outline-none", variants[variant], className)} {...rest} />;
}
