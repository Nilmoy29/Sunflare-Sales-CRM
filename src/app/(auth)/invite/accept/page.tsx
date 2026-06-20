import { AuthBrandHeader } from "@/components/auth/auth-brand-header";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { InviteAcceptForm } from "@/features/auth/components/invite-accept-form";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_invite: "Invite link is invalid, expired, or already used. Ask admin for a new invite.",
};

export default async function InviteAcceptPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialError = params.error
    ? ERROR_MESSAGES[params.error] ?? "Unable to continue invite onboarding."
    : undefined;

  return (
    <main className="w-full max-w-sm">
      <AuthBrandHeader subtitle="Complete your account setup" />
      <AuthFormCard>
        <InviteAcceptForm initialError={initialError} />
      </AuthFormCard>
    </main>
  );
}
