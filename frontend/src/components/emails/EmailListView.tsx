"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CircleAlert, SearchX } from "lucide-react";
import type { Email, EmailListKind, EmailStatus } from "@/types/api";
import { useEmailList } from "@/hooks/useEmails";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { errorMessage } from "@/lib/api";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmailRow } from "./EmailRow";
import { ListToolbar, type FilterOption } from "./ListToolbar";

type Filter = "all" | EmailStatus;

export interface EmailListConfig {
  kind: EmailListKind;
  filters: FilterOption<Filter>[];
  showTime: boolean;
  empty: { icon: ReactNode; title: string; description: string };
}

function ListSkeleton() {
  return (
    <ul aria-hidden className="px-4">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="flex items-center gap-4 border-b border-line py-3.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-3.5 flex-1" />
        </li>
      ))}
    </ul>
  );
}

export function EmailListView({ config }: { config: EmailListConfig }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const query = useDebouncedValue(search.trim(), 300);
  const list = useEmailList(config.kind, query);

  const items = useMemo<Email[]>(
    () => (filter === "all" ? list.items : list.items.filter((e) => e.status === filter)),
    [list.items, filter],
  );

  let content: ReactNode;
  if (list.isPending) {
    content = <ListSkeleton />;
  } else if (list.error) {
    content = (
      <EmptyState
        icon={<CircleAlert className="size-5" />}
        title="Couldn't load emails"
        description={errorMessage(list.error)}
        action={<Button variant="outline" pill size="sm" onClick={() => list.refetch()}>Try again</Button>}
      />
    );
  } else if (items.length === 0) {
    const narrowed = query || filter !== "all";
    content = narrowed ? (
      <EmptyState
        icon={<SearchX className="size-5" />}
        title="No matching emails"
        description="Try a different search term or clear the filter."
      />
    ) : (
      <EmptyState
        {...config.empty}
        action={<Link href="/compose" className={buttonClasses({ variant: "outline", pill: true, size: "sm" })}>Compose</Link>}
      />
    );
  } else {
    content = (
      <>
        <ul className="px-0 sm:px-1">
          {items.map((email) => (
            <EmailRow key={email.id} email={email} showTime={config.showTime} />
          ))}
        </ul>
        {list.hasNextPage && (
          <div className="flex justify-center py-4">
            <Button variant="ghost" size="sm" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
              Load more
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <section className="flex flex-1 flex-col">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        filterOptions={config.filters}
        onFilterChange={setFilter}
        onRefresh={() => list.refetch()}
        refreshing={list.isFetching && !list.isPending}
      />
      {content}
    </section>
  );
}
