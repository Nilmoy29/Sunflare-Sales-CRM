"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type ResetRequestState,
} from "@/features/auth/actions";

const initialState: ResetRequestState = {};

export function ResetPasswordRequestForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
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
        {pending ? "Sending..." : "Send reset link"}
      </button>

      <Link className="text-sm text-zinc-600 underline hover:text-zinc-900" href="/login">
        Back to login
      </Link>
    </form>
  );
}
