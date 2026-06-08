"use client";

import { logoutAction } from "@/features/auth/actions";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="text-sm font-medium text-zinc-800 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-950"
      >
        Sign out
      </button>
    </form>
  );
}
