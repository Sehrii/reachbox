"use client";

import { ListFilter, RotateCw, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";
import { MenuItem, MenuLabel } from "@/components/ui/Menu";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface ListToolbarProps<T extends string> {
  search: string;
  onSearchChange: (v: string) => void;
  filter: T;
  filterOptions: FilterOption<T>[];
  onFilterChange: (v: T) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function ListToolbar<T extends string>({
  search,
  onSearchChange,
  filter,
  filterOptions,
  onFilterChange,
  onRefresh,
  refreshing,
}: ListToolbarProps<T>) {
  const filtered = filter !== filterOptions[0]?.value;

  return (
    <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
      <label className="relative flex h-9 max-w-[440px] flex-1 items-center rounded-full bg-surface px-3.5">
        <Search className="mr-2 size-4 shrink-0 text-muted" />
        <span className="sr-only">Search emails</span>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          className="h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted"
        />
        {search && (
          <button type="button" aria-label="Clear search" onClick={() => onSearchChange("")} className="text-muted hover:text-ink">
            <X className="size-3.5" />
          </button>
        )}
      </label>

      <Popover
        trigger={({ toggle, open }) => (
          <IconButton label="Filter" onClick={toggle} active={filtered || open}>
            <ListFilter className="size-4" />
          </IconButton>
        )}
      >
        {(close) => (
          <div role="menu">
            <MenuLabel>Status</MenuLabel>
            {filterOptions.map((o) => (
              <MenuItem
                key={o.value}
                selected={o.value === filter}
                onClick={() => {
                  onFilterChange(o.value);
                  close();
                }}
              >
                {o.label}
              </MenuItem>
            ))}
          </div>
        )}
      </Popover>

      <IconButton label="Refresh" onClick={onRefresh}>
        <RotateCw className={cn("size-4", refreshing && "animate-spin")} />
      </IconButton>
    </div>
  );
}
