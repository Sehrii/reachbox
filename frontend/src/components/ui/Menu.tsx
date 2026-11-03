import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  selected?: boolean;
  tone?: "default" | "danger";
}

export function MenuItem({ icon, selected, tone = "default", className, children, ...rest }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
        "hover:bg-surface disabled:opacity-50 disabled:pointer-events-none",
        tone === "danger" ? "text-red-600" : "text-ink",
        selected && "bg-brand-soft font-medium",
        className,
      )}
      {...rest}
    >
      {icon && <span className="text-muted [&>svg]:size-4">{icon}</span>}
      {children}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-2.5 pt-2 pb-1 text-[10px] font-medium tracking-wider text-muted uppercase">{children}</p>;
}

export function MenuDivider() {
  return <div className="my-1 h-px bg-line" />;
}
