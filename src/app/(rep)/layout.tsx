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
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Rep
          </p>
          <p className="text-sm font-medium">{profile?.name ?? "Field rep"}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            className="text-sm text-zinc-600 underline hover:text-zinc-900"
            href="/rep/pipeline"
          >
            Pipeline
          </Link>
          <Link
            className="text-sm text-zinc-600 underline hover:text-zinc-900"
            href="/rep/history"
          >
            Knock history
          </Link>
          <Link className="text-sm text-zinc-600 underline hover:text-zinc-900" href="/rep/profile">
            My profile
          </Link>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
