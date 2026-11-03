"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime, toLocalInputValue } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";

function tomorrowAt(hours?: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  if (hours !== undefined) d.setHours(hours, 0, 0, 0);
  else d.setSeconds(0, 0);
  return d;
}

const PRESETS: { label: string; get: () => Date }[] = [
  { label: "Tomorrow", get: () => tomorrowAt() },
  { label: "Tomorrow, 10:00 AM", get: () => tomorrowAt(10) },
  { label: "Tomorrow, 11:00 AM", get: () => tomorrowAt(11) },
  { label: "Tomorrow, 3:00 PM", get: () => tomorrowAt(15) },
];

interface SendLaterPopoverProps {
  value: Date | null;
  onChange: (d: Date | null) => void;
}

export function SendLaterPopover({ value, onChange }: SendLaterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [openedAt, setOpenedAt] = useState(0);

  const openWith = (next: boolean) => {
    if (next) {
      setDraft(value ? toLocalInputValue(value) : "");
      setOpenedAt(Date.now());
    }
    setOpen(next);
  };

  const draftDate = draft ? new Date(draft) : null;
  const inPast = draftDate !== null && draftDate.getTime() < openedAt - 60_000;

  return (
    <Popover
      align="end"
      open={open}
      onOpenChange={openWith}
      panelClassName="w-72 p-4"
      trigger={({ toggle }) => (
        <IconButton label={value ? `Starts ${formatDateTime(value.toISOString())}` : "Send later"} onClick={toggle} active={!!value}>
          <Clock className="size-[18px]" />
        </IconButton>
      )}
    >
      <p className="mb-3 text-[15px] font-semibold text-ink">Send Later</p>
      <label className="block border-b border-line pb-1.5">
        <span className="sr-only">Pick date & time</span>
        <input
          type="datetime-local"
          value={draft}
          min={openedAt ? toLocalInputValue(new Date(openedAt)) : undefined}
          onChange={(e) => setDraft(e.target.value)}
          className={cn("w-full bg-transparent text-[13px] outline-none", draft ? "text-ink" : "text-muted")}
        />
      </label>
      {inPast && <p className="mt-1 text-[11px] text-red-600">That time is in the past. Sending will start right away.</p>}
      <ul className="mt-2 mb-4">
        {PRESETS.map((p) => {
          const v = toLocalInputValue(p.get());
          return (
            <li key={p.label}>
              <button
                type="button"
                onClick={() => setDraft(v)}
                className={cn(
                  "w-full rounded-md px-1 py-2 text-left text-[13px] text-ink hover:bg-surface",
                  draft === v && "bg-brand-soft font-medium",
                )}
              >
                {p.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between">
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="text-xs text-muted hover:text-ink"
          >
            Send now instead
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" pill onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            pill
            disabled={!draftDate}
            onClick={() => {
              onChange(draftDate);
              setOpen(false);
            }}
          >
            Done
          </Button>
        </div>
      </div>
    </Popover>
  );
}
