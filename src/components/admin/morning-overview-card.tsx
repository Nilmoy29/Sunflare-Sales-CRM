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
    <section className="rounded-lg border border-border bg-card px-4 py-4">
      <h2 className="text-lg font-semibold text-foreground">Morning overview</h2>

      {error ? (
        <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground ring-1 ring-border">
          {error}
        </p>
      ) : null}

      {loading && !overview ? (
        <div className="mt-3 h-6 w-64 animate-pulse rounded bg-secondary" />
      ) : null}

      {overview ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{overview.label}</p>
          <p className="mt-3 text-sm font-medium text-foreground">
            {overview.totals.doors} doors · {overview.totals.calls} calls ·{" "}
            {overview.totals.leads_added} leads ·{" "}
            {overview.totals.appointments_set} appts
          </p>
        </>
      ) : null}
    </section>
  );
}
