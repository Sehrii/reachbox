import { EmailDetail } from "@/components/emails/EmailDetail";

// Rendered behind the client-side AuthGuard (see (app)/layout.tsx).
export const instant = false;

export default async function EmailPage({ params }: PageProps<"/emails/[id]">) {
  const { id } = await params;
  return <EmailDetail id={id} />;
}
