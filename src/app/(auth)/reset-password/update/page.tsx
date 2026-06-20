import { AuthBrandHeader } from "@/components/auth/auth-brand-header";
import { AuthFormCard } from "@/components/auth/auth-form-card";
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
      <AuthBrandHeader subtitle="Set your new password" />
      <AuthFormCard>
        <ResetPasswordUpdateForm initialError={initialError} />
      </AuthFormCard>
    </main>
  );
}
