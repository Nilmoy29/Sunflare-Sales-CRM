import Link from "next/link";
import { ResetPasswordUpdateForm } from "@/features/auth/components/reset-password-update-form";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback: "Reset link is invalid or expired. Please request a new one.",
  invalid_recovery: "Reset link is invalid or expired. Please request a new one.",
};

export default async function ResetPasswordUpdatePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialError = params.error
    ? ERROR_MESSAGES[params.error] ?? "Unable to reset password. Request a new link."
    : undefined;

  return (
    <main className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <Link href="/" className="text-2xl font-semibold tracking-tight">
          Sunflare
        </Link>
        <p className="mt-2 text-sm text-zinc-600">Set your new password</p>
      </div>
      <ResetPasswordUpdateForm initialError={initialError} />
    </main>
  );
}
