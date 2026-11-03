import type { Metadata } from "next";
import { ComposeForm } from "@/components/compose/ComposeForm";

export const metadata: Metadata = { title: "Compose · ONB" };

// Rendered behind the client-side AuthGuard (see (app)/layout.tsx).
export const instant = false;

export default function ComposePage() {
  return <ComposeForm />;
}
