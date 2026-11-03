import Link from "next/link";
import type { Email } from "@/types/api";
import { formatDateTime, formatListTime, htmlToText } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { StarButton } from "./StarButton";

interface EmailRowProps {
  email: Email;
  /** Right-hand timestamp (sent time on the Sent tab); the scheduled time already lives in the badge. */
  showTime?: boolean;
}

export function EmailRow({ email, showTime }: EmailRowProps) {
  const time = email.sentAt ?? email.updatedAt;
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        href={`/emails/${email.id}`}
        className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#fafafa] sm:gap-4"
      >
        <span className="w-28 shrink-0 truncate text-[13px] font-semibold text-ink sm:w-36" title={email.recipient}>
          To: {email.recipient}
        </span>
        <StatusBadge email={email} />
        <span className="min-w-0 flex-1 truncate text-[13px]">
          <span className="font-semibold text-ink">{email.subject}</span>
          <span className="text-muted"> - {htmlToText(email.body)}</span>
        </span>
        {showTime && (
          <time dateTime={time} title={formatDateTime(time)} className="hidden shrink-0 text-xs text-muted sm:block">
            {formatListTime(time)}
          </time>
        )}
        <StarButton emailId={email.id} />
      </Link>
    </li>
  );
}
