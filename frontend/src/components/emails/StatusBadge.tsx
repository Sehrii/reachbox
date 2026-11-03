import { Clock, LoaderCircle } from "lucide-react";
import type { Email } from "@/types/api";
import { formatBadgeTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export function StatusBadge({ email }: { email: Pick<Email, "status" | "scheduledAt"> }) {
  switch (email.status) {
    case "scheduled":
      return (
        <Badge tone="orange" icon={<Clock className="size-3" />}>
          {formatBadgeTime(email.scheduledAt)}
        </Badge>
      );
    case "sending":
      return (
        <Badge tone="orange" icon={<LoaderCircle className="size-3 animate-spin" />}>
          Sending
        </Badge>
      );
    case "sent":
      return <Badge tone="gray">Sent</Badge>;
    case "failed":
      return <Badge tone="red">Failed</Badge>;
  }
}
