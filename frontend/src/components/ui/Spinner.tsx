import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return <LoaderCircle role="status" aria-label={label} className={cn("size-4 animate-spin", className)} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted">
      <Spinner className="size-6" />
    </div>
  );
}
