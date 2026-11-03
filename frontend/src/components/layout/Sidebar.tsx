"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Send, type LucideIcon } from "lucide-react";
import { useEmailStats } from "@/hooks/useEmails";
import { cn } from "@/lib/cn";
import { buttonClasses } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

function NavItem({ href, label, icon: Icon, count }: NavItemProps) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
        active ? "bg-brand-soft font-semibold text-ink" : "text-ink/80 hover:bg-surface",
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-[11px] font-normal text-muted">{count.toLocaleString()}</span>}
    </Link>
  );
}

export function Sidebar() {
  const { data: stats } = useEmailStats();

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 border-b border-line p-3 md:sticky md:top-0 md:h-screen md:w-[176px] md:border-r md:border-b-0">
      <div className="px-1.5 pt-1 pb-1">
        <Logo />
      </div>
      <UserMenu />
      <Link href="/compose" className={buttonClasses({ variant: "outline", pill: true, size: "sm", className: "w-full" })}>
        Compose
      </Link>
      <nav className="mt-1 flex flex-col gap-0.5" aria-label="Mailboxes">
        <p className="px-2.5 pb-1 text-[10px] font-medium tracking-wider text-muted uppercase">Core</p>
        <NavItem href="/dashboard" label="Scheduled" icon={Clock} count={stats?.scheduled} />
        <NavItem href="/dashboard/sent" label="Sent" icon={Send} count={stats ? stats.sent + stats.failed : undefined} />
      </nav>
    </aside>
  );
}
