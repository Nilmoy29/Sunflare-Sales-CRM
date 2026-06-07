import Link from "next/link";
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
      : params.notice === "invite_complete"
        ? "Onboarding complete. Please sign in."
        : undefined;

  return (
    <main className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <Link href="/" className="text-2xl font-semibold tracking-tight">
          Sunflare
        </Link>
        <p className="mt-2 text-sm text-zinc-600">Solar CRM — sign in</p>
      </div>
      <LoginForm nextPath={params.next} initialError={initialError} />
      {notice ? (
        <p className="mt-3 text-center text-sm text-emerald-700">{notice}</p>
      ) : null}
      <div className="mt-4 text-center">
        <Link
          href="/reset-password"
          className="text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          Forgot password?
        </Link>
      </div>
    </main>
  );
}
