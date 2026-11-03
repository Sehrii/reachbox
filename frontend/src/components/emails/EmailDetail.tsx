"use client";

import { CircleAlert, ExternalLink, MailX } from "lucide-react";
import { useEmail } from "@/hooks/useEmails";
import { useMe } from "@/hooks/useAuth";
import { ApiError, errorMessage } from "@/lib/api";
import { formatDateTime, pluralize } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmailBody } from "./EmailBody";
import { StarButton } from "./StarButton";
import { StatusBadge } from "./StatusBadge";

export function EmailDetail({ id }: { id: string }) {
  const { data: email, isPending, error } = useEmail(id);
  const { data: me } = useMe();

  const headerActions = (
    <>
      {email && <StarButton emailId={email.id} />}
      {me && <Avatar name={me.user.name} src={me.user.avatarUrl} size="sm" className="ml-1" />}
    </>
  );

  if (isPending) {
    return (
      <>
        <PageHeader title={<Skeleton className="h-6 w-72" />} actions={headerActions} />
        <div className="mx-auto max-w-[700px] space-y-3 px-6 pt-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </>
    );
  }

  if (error || !email) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <>
        <PageHeader title="Email" actions={headerActions} />
        <EmptyState
          icon={notFound ? <MailX className="size-5" /> : <CircleAlert className="size-5" />}
          title={notFound ? "Email not found" : "Couldn't load this email"}
          description={notFound ? "It may have been removed, or it belongs to another account." : errorMessage(error)}
        />
      </>
    );
  }

  const when = email.sentAt ?? email.scheduledAt;

  return (
    <>
      <PageHeader title={email.subject} actions={headerActions} />
      <article className="mx-auto w-full max-w-[700px] px-4 pb-16 sm:px-6">
        <div className="flex items-start gap-3 pt-2">
          <Avatar name={email.senderEmail} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <p className="truncate text-[13px]">
                <span className="font-semibold text-ink">{email.senderEmail.split("@")[0]}</span>{" "}
                <span className="text-muted">&lt;{email.senderEmail}&gt;</span>
              </p>
              <time dateTime={when} className="text-xs text-muted">
                {email.status === "sent" ? "" : email.status === "failed" ? "Attempted · " : "Scheduled · "}
                {formatDateTime(email.status === "failed" ? email.updatedAt : when)}
              </time>
            </div>
            <p className="text-xs text-muted">to {email.recipient}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
          <StatusBadge email={email} />
          {email.rescheduleCount > 0 && (
            <span>Moved {pluralize(email.rescheduleCount, "time")} by the hourly rate limit</span>
          )}
          {email.previewUrl && (
            <a
              href={email.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
            >
              View on Ethereal <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        {email.failedReason && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{email.failedReason}</p>
        )}

        <div className="mt-6 pl-0 sm:pl-[52px]">
          <EmailBody html={email.body} />
        </div>
      </article>
    </>
  );
}
