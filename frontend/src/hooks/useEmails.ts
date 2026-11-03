"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { EmailListKind, ScheduleRequest } from "@/types/api";

const PAGE_SIZE = 50;
// Scheduled emails change state on their own (sending → sent), so poll faster there.
const POLL_MS: Record<EmailListKind, number> = { scheduled: 5_000, sent: 15_000 };

export const emailKeys = {
  all: ["emails"] as const,
  list: (kind: EmailListKind) => ["emails", kind, "list"] as const,
  search: (kind: EmailListKind, q: string) => ["emails", kind, "search", q] as const,
  detail: (id: string) => ["emails", "detail", id] as const,
  stats: ["emails", "stats"] as const,
};

/** Paginated list, or search results when `search` is non-empty. Same shape either way. */
export function useEmailList(kind: EmailListKind, search: string) {
  const searching = search.length > 0;

  const list = useInfiniteQuery({
    queryKey: emailKeys.list(kind),
    queryFn: ({ pageParam }) => api.listEmails(kind, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    refetchInterval: POLL_MS[kind],
    enabled: !searching,
  });

  const results = useQuery({
    queryKey: emailKeys.search(kind, search),
    queryFn: () => api.searchEmails(search, kind),
    enabled: searching,
  });

  if (searching) {
    return {
      items: results.data?.items ?? [],
      isPending: results.isPending,
      isFetching: results.isFetching,
      error: results.error,
      refetch: results.refetch,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: () => undefined,
    };
  }
  return {
    items: list.data?.pages.flatMap((p) => p.items) ?? [],
    isPending: list.isPending,
    isFetching: list.isFetching,
    error: list.error,
    refetch: list.refetch,
    hasNextPage: list.hasNextPage,
    isFetchingNextPage: list.isFetchingNextPage,
    fetchNextPage: list.fetchNextPage,
  };
}

export function useEmailStats() {
  return useQuery({ queryKey: emailKeys.stats, queryFn: api.stats, refetchInterval: 10_000 });
}

export function useEmail(id: string) {
  return useQuery({ queryKey: emailKeys.detail(id), queryFn: () => api.getEmail(id) });
}

export function useSenders() {
  return useQuery({ queryKey: ["senders"], queryFn: api.senders, staleTime: 5 * 60_000 });
}

export function useScheduleEmails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ScheduleRequest) => api.schedule(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: emailKeys.all }),
  });
}
