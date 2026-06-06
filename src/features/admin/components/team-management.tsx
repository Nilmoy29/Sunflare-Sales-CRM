"use client";

import { useActionState } from "react";
import {
  createRepAction,
  inviteRepAction,
  sendResetEmailAction,
  setRepActiveAction,
  type TeamActionState,
} from "@/features/admin/team-actions";

type TeamMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  start_date: string | null;
  created_at: string;
};

type TeamManagementProps = {
  reps: TeamMember[];
};

const initialState: TeamActionState = {};

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-AU");
}

export function TeamManagement({ reps }: TeamManagementProps) {
  const [createState, createAction, createPending] = useActionState(createRepAction, initialState);
  const [inviteState, inviteAction, invitePending] = useActionState(inviteRepAction, initialState);
  const [resetState, resetAction, resetPending] = useActionState(sendResetEmailAction, initialState);
  const [statusState, statusAction, statusPending] = useActionState(setRepActiveAction, initialState);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Create rep</h2>
        <form action={createAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            name="email"
            type="email"
            placeholder="rep@example.com"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="name"
            type="text"
            placeholder="Rep name"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="phone"
            type="tel"
            placeholder="Phone (optional)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="start_date"
            type="date"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={createPending}
            className="h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {createPending ? "Creating..." : "Create rep"}
          </button>
        </form>
        {createState.error ? <p className="mt-2 text-sm text-red-600">{createState.error}</p> : null}
        {createState.success ? <p className="mt-2 text-sm text-emerald-700">{createState.success}</p> : null}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Invite rep</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Send a secure onboarding link so the rep can set their own password.
        </p>
        <form action={inviteAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            name="email"
            type="email"
            placeholder="rep@example.com"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="name"
            type="text"
            placeholder="Rep name"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="phone"
            type="tel"
            placeholder="Phone (optional)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="start_date"
            type="date"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={invitePending}
            className="h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {invitePending ? "Sending..." : "Send invite"}
          </button>
        </form>
        {inviteState.error ? <p className="mt-2 text-sm text-red-600">{inviteState.error}</p> : null}
        {inviteState.success ? <p className="mt-2 text-sm text-emerald-700">{inviteState.success}</p> : null}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Rep accounts</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Start</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => (
                <tr key={rep.id} className="border-b border-zinc-100">
                  <td className="py-3 pr-4 font-medium">{rep.name}</td>
                  <td className="py-3 pr-4">{rep.email ?? "-"}</td>
                  <td className="py-3 pr-4">{rep.phone ?? "-"}</td>
                  <td className="py-3 pr-4">{formatDate(rep.start_date)}</td>
                  <td className="py-3 pr-4">{rep.active ? "Active" : "Inactive"}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <form action={statusAction}>
                        <input type="hidden" name="user_id" value={rep.id} />
                        <input type="hidden" name="active" value={rep.active ? "false" : "true"} />
                        <button
                          type="submit"
                          disabled={statusPending}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
                        >
                          {rep.active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <form action={resetAction}>
                        <input type="hidden" name="user_id" value={rep.id} />
                        <button
                          type="submit"
                          disabled={resetPending}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
                        >
                          Send reset
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {statusState.error ? <p className="mt-2 text-sm text-red-600">{statusState.error}</p> : null}
        {statusState.success ? <p className="mt-2 text-sm text-emerald-700">{statusState.success}</p> : null}
        {resetState.error ? <p className="mt-2 text-sm text-red-600">{resetState.error}</p> : null}
        {resetState.success ? <p className="mt-2 text-sm text-emerald-700">{resetState.success}</p> : null}
      </section>
    </div>
  );
}
