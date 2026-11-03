"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/** Shows the outcome of the Slack OAuth round-trip (?slack=connected|error), then cleans the URL. */
export function SlackRedirectNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const result = params.get("slack");
  const reason = params.get("reason");

  useEffect(() => {
    if (!result) return;
    if (result === "connected") {
      toast.success("Slack connected. You'll get an alert when a rate limit is hit.");
      void queryClient.invalidateQueries({ queryKey: ["slack"] });
    } else {
      toast.error(`Couldn't connect Slack${reason ? `: ${reason}` : ""}`);
    }
    router.replace(pathname);
  }, [result, reason, router, pathname, queryClient]);

  return null;
}
