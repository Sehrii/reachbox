"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage, getGoogleLoginUrl } from "@/lib/api";
import { useMe, meQueryKey } from "@/hooks/useAuth";
import { isEmail } from "@/lib/parseEmails";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleIcon } from "@/components/ui/icons";

const DEV_LOGIN = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";

const OAUTH_ERRORS: Record<string, string> = {
  access_denied: "Google sign-in was cancelled.",
  invalid_state: "Your sign-in session expired. Please try again.",
};

export function LoginCard() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → straight to the dashboard.
  useEffect(() => {
    if (me) router.replace("/dashboard");
  }, [me, router]);

  // Errors bounced back from the Google OAuth callback.
  const oauthError = params.get("error");
  useEffect(() => {
    if (oauthError) toast.error(OAUTH_ERRORS[oauthError] ?? `Google sign-in failed (${oauthError})`);
  }, [oauthError]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!DEV_LOGIN) {
      toast.info("Email sign-in isn't available. Please continue with Google.");
      return;
    }
    if (!isEmail(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      await api.devLogin(email.trim());
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      router.replace("/dashboard");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[326px] rounded-xl border border-line bg-white px-9 pt-9 pb-8">
      <h1 className="mb-5 text-center text-[26px] font-bold text-ink">Login</h1>

      <a href={getGoogleLoginUrl()} className={buttonClasses({ variant: "soft", size: "lg", className: "w-full font-normal" })}>
        <GoogleIcon />
        Login with Google
      </a>

      <div className="my-5 flex items-center gap-3 text-[10px] text-muted">
        <span className="h-px flex-1 bg-line" />
        or sign up through email
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={onSubmit} className="space-y-2.5">
        <Input
          type="email"
          placeholder="Email ID"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="text-xs"
        />
        <Input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="text-xs"
        />
        <Button type="submit" size="lg" className="mt-2 w-full font-normal" loading={submitting}>
          Login
        </Button>
      </form>
      {DEV_LOGIN && (
        <p className="mt-3 text-center text-[10px] text-muted">Dev login is on: any email works and the password is ignored.</p>
      )}
    </div>
  );
}
