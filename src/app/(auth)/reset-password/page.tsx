import Link from "next/link";
import { ResetPasswordRequestForm } from "@/features/auth/components/reset-password-request-form";

export default function ResetPasswordPage() {
  return (
    <main className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <Link href="/" className="text-2xl font-semibold tracking-tight">
          Sunflare
        </Link>
        <p className="mt-2 text-sm text-zinc-600">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>
      <ResetPasswordRequestForm />
    </main>
  );
}
