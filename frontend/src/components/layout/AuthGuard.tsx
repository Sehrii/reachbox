"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { useMe } from "@/hooks/useAuth";
import { ApiError, errorMessage } from "@/lib/api";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

/** Renders children only for a signed-in user; sends everyone else to /login. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, error, isPending, refetch } = useMe();
  const unauthenticated = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (unauthenticated) router.replace("/login");
  }, [unauthenticated, router]);

  if (isPending || unauthenticated) return <FullPageSpinner />;
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <EmptyState
          icon={<CircleAlert className="size-5" />}
          title="Couldn't load your account"
          description={errorMessage(error)}
          action={<Button variant="outline" pill onClick={() => refetch()}>Try again</Button>}
        />
      </div>
    );
  }
  return children;
}
