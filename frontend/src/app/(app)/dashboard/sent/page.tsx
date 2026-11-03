import type { Metadata } from "next";
import { Send } from "lucide-react";
import { EmailListView } from "@/components/emails/EmailListView";

export const metadata: Metadata = { title: "Sent · ONB" };

// Rendered behind the client-side AuthGuard (see (app)/layout.tsx).
export const instant = false;

export default function SentPage() {
  return (
    <EmailListView
      config={{
        kind: "sent",
        showTime: true,
        filters: [
          { value: "all", label: "All" },
          { value: "sent", label: "Sent" },
          { value: "failed", label: "Failed" },
        ],
        empty: {
          icon: <Send className="size-5" />,
          title: "No sent emails yet",
          description: "Once a scheduled email goes out, it appears here with its sent time.",
        },
      }}
    />
  );
}
