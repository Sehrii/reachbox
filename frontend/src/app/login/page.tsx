import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginCard } from "@/components/auth/LoginCard";

export const metadata: Metadata = { title: "Login · ONB" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <Suspense>
        <LoginCard />
      </Suspense>
    </main>
  );
}
