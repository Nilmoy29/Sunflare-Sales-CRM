import { SignupPageClient } from "@/features/auth/components/signup-page-client";
import { getInviteSessionStatus } from "@/features/auth/invite-session";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_invite:
    "Invite link is invalid, expired, or already used. Ask your admin for a new invite.",
};

export default async function SignupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const inviteSession = await getInviteSessionStatus();
  const initialError = params.error
    ? (ERROR_MESSAGES[params.error] ?? "Unable to continue account setup.")
    : undefined;

  return (
    <SignupPageClient
      inviteSession={inviteSession}
      initialError={initialError}
    />
  );
}
