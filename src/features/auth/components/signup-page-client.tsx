"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthBrandHeader } from "@/components/auth/auth-brand-header";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { InviteAcceptForm } from "@/features/auth/components/invite-accept-form";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/client";
import type { InviteSessionStatus } from "@/features/auth/invite-session";

type SignupPageClientProps = {
  inviteSession: InviteSessionStatus;
  initialError?: string;
};

function SignupGuidance({ message }: { message: string }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 text-center">
      <p className="text-sm leading-relaxed text-zinc-600">{message}</p>
      <p className="text-sm leading-relaxed text-zinc-500">
        Open the secure link in your invite email to set your password and finish
        your profile. Links expire after a short period.
      </p>
      <Link
        href={LOGIN_PATH}
        className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900"
      >
        Back to sign in
      </Link>
    </div>
  );
}

export function SignupPageClient({
  inviteSession,
  initialError,
}: SignupPageClientProps) {
  const router = useRouter();
  const [bootstrapping, setBootstrapping] = useState(false);
  const [clearedStaleError, setClearedStaleError] = useState(false);

  useEffect(() => {
    const rawHash = window.location.hash.replace(/^#/, "");
    if (!rawHash) {
      return;
    }

    const params = new URLSearchParams(rawHash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      return;
    }

    let cancelled = false;
    setClearedStaleError(true);

    async function bootstrap() {
      setBootstrapping(true);
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (cancelled) {
        return;
      }

      if (error) {
        setBootstrapping(false);
        return;
      }

      const inviteRes = await fetch("/api/auth/invite-session", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!inviteRes.ok) {
        setBootstrapping(false);
        return;
      }

      const url = new URL(window.location.href);
      url.hash = "";
      url.searchParams.delete("error");
      router.replace(`${url.pathname}${url.search}`);
      router.refresh();
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const formError = clearedStaleError ? undefined : initialError;

  if (bootstrapping) {
    return (
      <main className="w-full max-w-sm">
        <AuthBrandHeader subtitle="Set up your rep account" />
        <p className="text-center text-sm text-white/55" role="status">
          Preparing your account setup…
        </p>
      </main>
    );
  }

  if (inviteSession.state === "missing") {
    return (
      <main className="w-full max-w-sm">
        <AuthBrandHeader subtitle="Set up your rep account" />
        <AuthFormCard>
          <SignupGuidance message="Account setup requires an invite from your administrator." />
        </AuthFormCard>
      </main>
    );
  }

  if (inviteSession.state === "expired") {
    return (
      <main className="w-full max-w-sm">
        <AuthBrandHeader subtitle="Set up your rep account" />
        <AuthFormCard>
          <SignupGuidance message="Your invite session expired or was already used. Ask your admin to send a new invite." />
        </AuthFormCard>
      </main>
    );
  }

  return (
    <main className="w-full max-w-sm">
      <AuthBrandHeader subtitle="Create your password and complete your profile" />
      <AuthFormCard>
        <InviteAcceptForm initialError={formError} />
      </AuthFormCard>
    </main>
  );
}
