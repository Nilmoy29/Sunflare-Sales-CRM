"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRoleHomePath, isSafeNextPath } from "@/lib/auth/paths";
import { loginSchema } from "@/lib/validators/auth";

type LoginFormProps = {
  nextPath?: string;
  initialError?: string;
};

type LoginProfile = {
  role: "admin" | "rep";
  active: boolean;
};

export function LoginForm({ nextPath, initialError }: LoginFormProps) {
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError("Enter a valid email and password.");
      return;
    }

    setPending(true);
    setError(undefined);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (signInError) {
      setError("Invalid email or password.");
      setPending(false);
      return;
    }

    // Ensure session cookies are written before the server profile lookup.
    await supabase.auth.getSession();

    const profileRes = await fetch("/api/auth/profile", {
      credentials: "same-origin",
    });

    if (!profileRes.ok) {
      await supabase.auth.signOut();
      if (profileRes.status === 404) {
        setError(
          "Your account profile is missing. Contact your administrator.",
        );
      } else {
        setError("Sign in failed. Try again.");
      }
      setPending(false);
      return;
    }

    const profile = (await profileRes.json()) as LoginProfile;

    if (!profile.active) {
      await supabase.auth.signOut();
      setError("Your account is deactivated. Contact your administrator.");
      setPending(false);
      return;
    }

    const destination = isSafeNextPath(nextPath)
      ? nextPath
      : getRoleHomePath(profile.role);

    window.location.assign(destination);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
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
          autoComplete="current-password"
          required
          minLength={8}
          disabled={pending}
          className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-4 text-base font-semibold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-orange-400 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
