"use client";

import { useActionState } from "react";
import type { AuthProfile } from "@/lib/auth/session";
import {
  updateProfileAction,
  type ProfileFormState,
} from "@/features/auth/actions";

type ProfileFormProps = {
  profile: AuthProfile;
};

const initialState: ProfileFormState = {};

function displayDate(value: string | null) {
  if (!value) return "Not set";
  try {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return value;
  }
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={profile.name}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-zinc-700">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile.phone ?? ""}
          placeholder="Optional"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm md:grid-cols-2">
        <div>
          <p className="text-zinc-500">Role</p>
          <p className="font-medium text-zinc-900">{profile.role}</p>
        </div>
        <div>
          <p className="text-zinc-500">Status</p>
          <p className="font-medium text-zinc-900">{profile.active ? "Active" : "Inactive"}</p>
        </div>
        <div>
          <p className="text-zinc-500">Territory ID</p>
          <p className="font-medium text-zinc-900 break-all">
            {profile.territory_id ?? "Not assigned"}
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Start date</p>
          <p className="font-medium text-zinc-900">{displayDate(profile.start_date)}</p>
        </div>
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
