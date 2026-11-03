"use client";

import { Star } from "lucide-react";
import { useStarred } from "@/hooks/useStarred";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/IconButton";

export function StarButton({ emailId }: { emailId: string }) {
  const { isStarred, toggle } = useStarred();
  const starred = isStarred(emailId);
  return (
    <IconButton
      label={starred ? "Unstar" : "Star"}
      aria-pressed={starred}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(emailId);
      }}
    >
      <Star className={cn("size-4", starred && "fill-amber-400 text-amber-400")} />
    </IconButton>
  );
}
