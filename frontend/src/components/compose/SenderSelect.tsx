"use client";

import { ChevronDown } from "lucide-react";
import { useSenders } from "@/hooks/useEmails";
import { Popover } from "@/components/ui/Popover";
import { MenuItem, MenuLabel } from "@/components/ui/Menu";
import { Skeleton } from "@/components/ui/Skeleton";

interface SenderSelectProps {
  /** undefined = rotate across every sender */
  value: string | undefined;
  onChange: (senderId: string | undefined) => void;
}

export function SenderSelect({ value, onChange }: SenderSelectProps) {
  const { data, isPending } = useSenders();
  if (isPending) return <Skeleton className="h-8 w-48 rounded-md" />;

  const senders = data?.items ?? [];
  const selected = senders.find((s) => s.id === value);
  const label = selected?.email ?? `All senders (${senders.length}, rotating)`;

  return (
    <Popover
      panelClassName="w-80"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="inline-flex h-8 max-w-full items-center gap-2 rounded-md bg-surface px-2.5 text-[13px] text-ink hover:bg-[#ececec]"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted" />
        </button>
      )}
    >
      {(close) => (
        <div role="menu">
          <MenuItem
            selected={!value}
            onClick={() => {
              onChange(undefined);
              close();
            }}
          >
            All senders (rotate to spread load)
          </MenuItem>
          <MenuLabel>Ethereal accounts</MenuLabel>
          {senders.map((s) => (
            <MenuItem
              key={s.id}
              selected={s.id === value}
              onClick={() => {
                onChange(s.id);
                close();
              }}
            >
              <span className="truncate">{s.email}</span>
            </MenuItem>
          ))}
        </div>
      )}
    </Popover>
  );
}
