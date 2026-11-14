"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, clearToken, errorMessage } from "@/lib/api";

export const meQueryKey = ["me"] as const;

export function useMe() {
  return useQuery({ queryKey: meQueryKey, queryFn: api.me, staleTime: 60_000 });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      clearToken();
      queryClient.clear();
      router.replace("/login");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}
