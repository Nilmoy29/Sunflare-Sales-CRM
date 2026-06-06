"use client";

import type { MorningOverviewResponse } from "@/lib/validators/dashboard-coaching";

type MorningOverviewCardProps = {
  overview: MorningOverviewResponse | null;
  loading: boolean;
  error: string | null;
};

export function MorningOverviewCard({
  overview,
  loading,
  error,
}: MorningOverviewCardProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
      <h2 className="text-lg font-semibold text-zinc-900">Morning overview</h2>

      {error ? (
        <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 ring-1 ring-zinc-200">
          {error}
        </p>
      ) : null}

      {loading && !overview ? (
        <div className="mt-3 h-6 w-64 animate-pulse rounded bg-zinc-100" />
      ) : null}

      {overview ? (
        <>
          <p className="mt-1 text-sm text-zinc-600">{overview.label}</p>
          <p className="mt-3 text-sm font-medium text-zinc-900">
            {overview.totals.doors} doors · {overview.totals.calls} calls ·{" "}
            {overview.totals.leads_added} leads ·{" "}
            {overview.totals.appointments_set} appts
          </p>
        </>
      ) : null}
    </section>
  );
}
