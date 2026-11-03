import { AuthGuard } from "@/components/layout/AuthGuard";

// Auth is resolved in the browser (session cookie belongs to the API), so these routes
// intentionally wait for the client before rendering; opt out of instant-nav validation.
export const instant = false;

/** Everything in this group requires a signed-in user. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
