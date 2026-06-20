"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  acceptInviteAction,
  type InviteAcceptState,
} from "@/features/auth/actions";

const initialState: InviteAcceptState = {};

type InviteAcceptFormProps = {
  initialError?: string;
};

export function InviteAcceptForm({ initialError }: InviteAcceptFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(acceptInviteAction, {
    ...initialState,
    error: initialError,
  });

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push("/login?notice=invite_complete");
      }, 1200);
      return () => clearTimeout(timer);
    }
    return;
  }, [router, state.success]);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium text-zinc-700">
          Phone (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="confirm_password"
          className="text-sm font-medium text-zinc-700"
        >
          Confirm password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-4 text-sm font-semibold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-orange-400 disabled:opacity-60"
      >
        {pending ? "Completing..." : "Complete onboarding"}
      </button>

      <Link
        className="text-sm text-zinc-600 underline hover:text-zinc-900"
        href="/login"
      >
        Back to login
      </Link>
    </form>
  );
}
