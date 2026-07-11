import Link from "next/link";
import { AuthBrandHeader } from "@/components/auth/auth-brand-header";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { LoginForm } from "@/features/auth/components/login-form";

const ERROR_MESSAGES: Record<string, string> = {
  inactive: "Your account is deactivated. Contact your administrator.",
  auth_callback: "Sign-in link expired or invalid. Try again.",
  profile_missing: "Your account profile is missing. Contact your administrator.",
  invalid: "Enter a valid email and password.",
  invalid_credentials: "Invalid email or password.",
};

type PageProps = {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialError = params.error
    ? ERROR_MESSAGES[params.error] ?? "Sign in failed. Try again."
    : undefined;
  const notice =
    params.notice === "reset_success"
      ? "Password updated. Please sign in with your new password."
      : params.notice === "invite_complete" || params.notice === "signup_complete"
        ? "Account setup complete. Please sign in."
        : undefined;

  return (
    <main className="w-full max-w-sm">
      <AuthBrandHeader subtitle="Sign in to your account" />
      <AuthFormCard>
        <LoginForm nextPath={params.next} initialError={initialError} />
      </AuthFormCard>
      {notice ? (
        <p className="mt-4 text-center text-sm text-emerald-400">{notice}</p>
      ) : null}
      <div className="mt-4 flex flex-col items-center gap-2 text-center">
        <Link
          href="/reset-password"
          className="text-sm text-white/40 transition hover:text-white/60"
        >
          Forgot password?
        </Link>
        <p className="text-xs text-white/35">
          New rep?{" "}
          <Link href="/signup" className="underline transition hover:text-white/55">
            Complete account setup
          </Link>{" "}
          using your invite email.
        </p>
      </div>
    </main>
  );
}
