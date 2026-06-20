import { AuthBrandHeader } from "@/components/auth/auth-brand-header";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { ResetPasswordRequestForm } from "@/features/auth/components/reset-password-request-form";

export default function ResetPasswordPage() {
  return (
    <main className="w-full max-w-sm">
      <AuthBrandHeader subtitle="Enter your email and we'll send a reset link." />
      <AuthFormCard>
        <ResetPasswordRequestForm />
      </AuthFormCard>
    </main>
  );
}
