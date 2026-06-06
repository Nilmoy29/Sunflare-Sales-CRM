"use client";

import { logoutAction } from "@/features/auth/actions";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="text-sm text-zinc-600 underline hover:text-zinc-900"
      >
        Sign out
      </button>
    </form>
  );
}
