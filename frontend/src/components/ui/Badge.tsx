import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "orange" | "gray" | "red" | "green";

const tones: Record<Tone, string> = {
  orange: "bg-orange-50 text-orange-600 border-orange-200",
  gray: "bg-surface text-ink/80 border-line",
  red: "bg-red-50 text-red-600 border-red-200",
  green: "bg-brand-soft text-brand border-brand/30",
};

export function Badge({ tone = "gray", icon, children, className }: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
