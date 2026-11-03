import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SlackRedirectNotice } from "@/components/layout/SlackRedirectNotice";

// Rendered behind the client-side AuthGuard (see (app)/layout.tsx).
export const instant = false;

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <Suspense>
        <SlackRedirectNotice />
      </Suspense>
    </div>
  );
}
