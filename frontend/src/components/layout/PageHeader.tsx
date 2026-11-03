"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

/** Back arrow + title + right-side actions, used on compose and email detail. */
export function PageHeader({ title, actions, backHref = "/dashboard" }: {
  title: ReactNode;
  actions?: ReactNode;
  backHref?: string;
}) {
  const router = useRouter();
  const goBack = () => (window.history.length > 1 ? router.back() : router.push(backHref));

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-white/95 px-3 py-3 backdrop-blur sm:px-4">
      <IconButton label="Back" onClick={goBack} className="text-ink">
        <ArrowLeft className="size-5" />
      </IconButton>
      <h1 className="min-w-0 flex-1 truncate text-lg font-medium text-ink sm:text-xl">{title}</h1>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  );
}
