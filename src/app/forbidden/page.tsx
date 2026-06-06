import Link from "next/link";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

export default function ForbiddenPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="max-w-md text-sm text-zinc-600">
        You don&apos;t have permission to view this page for your role.
      </p>
      <div className="flex gap-4 text-sm">
        <Link className="underline" href="/login">
          Back to login
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
