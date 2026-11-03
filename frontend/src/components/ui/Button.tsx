import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "outline" | "soft" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  outline: "border border-brand text-brand bg-white hover:bg-brand-soft",
  soft: "bg-brand-soft text-ink hover:bg-brand-soft-hover",
  ghost: "text-ink hover:bg-surface",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-4 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

/** Shared class builder so links can look like buttons too. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  pill = false,
  className,
}: Pick<ButtonProps, "variant" | "size" | "pill" | "className">) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-medium transition-colors select-none",
    "disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    pill ? "rounded-full" : "rounded-lg",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant, size, pill, loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={buttonClasses({ variant, size, pill, className })}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}
