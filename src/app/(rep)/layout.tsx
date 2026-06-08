import Link from "next/link";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getAuthProfile } from "@/lib/auth/session";

export default async function RepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getAuthProfile();

  return (
    <div className="rep-theme flex h-dvh flex-col overflow-hidden bg-white text-zinc-950">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-300 bg-white px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
            Rep
          </p>
          <p className="text-sm font-semibold text-zinc-950">
            {profile?.name ?? "Field rep"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            className="text-sm font-medium text-zinc-800 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-950"
            href="/rep/calls"
          >
            Calls
          </Link>
          <Link
            className="text-sm font-medium text-zinc-800 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-950"
            href="/rep/pipeline"
          >
            Pipeline
          </Link>
          <Link
            className="text-sm font-medium text-zinc-800 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-950"
            href="/rep/history"
          >
            Knock history
          </Link>
          <Link
            className="text-sm font-medium text-zinc-800 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-950"
            href="/rep/profile"
          >
            My profile
          </Link>
          <SignOutButton />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
