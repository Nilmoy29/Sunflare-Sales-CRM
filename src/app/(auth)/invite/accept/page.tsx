import Link from "next/link";
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
      <div className="mb-8 text-center">
        <Link href="/" className="text-2xl font-semibold tracking-tight">
          Sunflare
        </Link>
        <p className="mt-2 text-sm text-zinc-600">
          You were invited to join the team. Complete your account setup.
        </p>
      </div>
      <InviteAcceptForm initialError={initialError} />
    </main>
  );
}
