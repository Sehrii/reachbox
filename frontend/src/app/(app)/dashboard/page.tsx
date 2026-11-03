import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { EmailListView } from "@/components/emails/EmailListView";

export const metadata: Metadata = { title: "Scheduled · ONB" };

// Rendered behind the client-side AuthGuard (see (app)/layout.tsx).
export const instant = false;

export default function ScheduledPage() {
  return (
    <EmailListView
      config={{
        kind: "scheduled",
        showTime: false,
        filters: [
          { value: "all", label: "All" },
          { value: "scheduled", label: "Waiting" },
          { value: "sending", label: "Sending" },
        ],
        empty: {
          icon: <Clock className="size-5" />,
          title: "No scheduled emails",
          description: "Emails you schedule show up here until they're sent.",
        },
      }}
    />
  );
}
