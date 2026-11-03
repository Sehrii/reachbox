"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";

const slackKey = ["slack"] as const;

export function useSlackStatus() {
  return useQuery({ queryKey: slackKey, queryFn: api.slackStatus });
}

export function useSlackTest() {
  return useMutation({
    mutationFn: api.slackTest,
    onSuccess: () => toast.success("Test message sent to Slack"),
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export function useSlackDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.slackDisconnect,
    onSuccess: () => {
      toast.success("Slack disconnected");
      return queryClient.invalidateQueries({ queryKey: slackKey });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}
