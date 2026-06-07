import Link from "next/link";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getAuthProfile } from "@/lib/auth/session";

export default async function AdminLayout({
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
            Admin
          </p>
          <p className="text-sm font-medium">{profile?.name ?? "Manager"}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link className="text-sm text-zinc-600 underline hover:text-zinc-900" href="/admin/dashboard">
            Dashboard
          </Link>
          <Link className="text-sm text-zinc-600 underline hover:text-zinc-900" href="/admin/pipeline">
            Pipeline
          </Link>
          <Link className="text-sm text-zinc-600 underline hover:text-zinc-900" href="/admin/map">
            Map
          </Link>
          <Link className="text-sm text-zinc-600 underline hover:text-zinc-900" href="/admin/territories">
            Territories
          </Link>
          <Link className="text-sm text-zinc-600 underline hover:text-zinc-900" href="/admin/team">
            Team management
          </Link>
          <Link className="text-sm text-zinc-600 underline hover:text-zinc-900" href="/admin/settings">
            Settings
          </Link>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
