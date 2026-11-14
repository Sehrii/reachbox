"use client";

import { ChevronDown, LogOut, Send, Unplug } from "lucide-react";
import { useLogout, useMe } from "@/hooks/useAuth";
import { useSlackDisconnect, useSlackStatus, useSlackTest } from "@/hooks/useSlack";
import { getSlackConnectUrl } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { Popover } from "@/components/ui/Popover";
import { MenuDivider, MenuItem, MenuLabel } from "@/components/ui/Menu";
import { SlackIcon } from "@/components/ui/icons";

export function UserMenu() {
  const { data } = useMe();
  const slack = useSlackStatus();
  const slackTest = useSlackTest();
  const slackDisconnect = useSlackDisconnect();
  const logout = useLogout();
  if (!data) return null;
  const { user } = data;

  return (
    <Popover
      className="w-full"
      panelClassName="w-64"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl bg-surface px-2.5 py-2 text-left transition-colors hover:bg-[#ececec]",
            open && "bg-[#ececec]",
          )}
        >
          <Avatar name={user.name} src={user.avatarUrl} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
            <span className="block truncate text-[10px] text-muted">{user.email}</span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
        </button>
      )}
    >
      {(close) => (
        <div role="menu">
          <MenuLabel>Slack alerts</MenuLabel>
          {slack.data?.connected ? (
            <>
              <p className="px-2.5 pb-1.5 text-xs text-muted">
                Connected to <span className="font-medium text-ink">{slack.data.channel}</span> in {slack.data.teamName}
              </p>
              <MenuItem icon={<Send />} onClick={() => slackTest.mutate()} disabled={slackTest.isPending}>
                Send test message
              </MenuItem>
              <MenuItem
                icon={<Unplug />}
                onClick={() => slackDisconnect.mutate(undefined, { onSuccess: close })}
                disabled={slackDisconnect.isPending}
              >
                Disconnect Slack
              </MenuItem>
            </>
          ) : (
            <a
              href={getSlackConnectUrl()}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink hover:bg-surface"
            >
              <SlackIcon />
              Connect Slack
            </a>
          )}
          <MenuDivider />
          <MenuItem icon={<LogOut />} tone="danger" onClick={() => logout.mutate()} disabled={logout.isPending}>
            Log out
          </MenuItem>
        </div>
      )}
    </Popover>
  );
}
