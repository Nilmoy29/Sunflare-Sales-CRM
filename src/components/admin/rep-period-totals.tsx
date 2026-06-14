"use client";

import { LEADERBOARD_METRIC_LABELS } from "@/lib/validators/team-leaderboard";
import type { RepPeriodTotals } from "@/features/dashboard/use-rep-activity-trend";

type RepPeriodTotalsProps = {
  totals: RepPeriodTotals;
  loading: boolean;
  hasError?: boolean;
};

const METRIC_KEYS = [
  "doors",
  "calls",
  "leads_added",
  "appointments_set",
] as const;

export function RepPeriodTotals({
  totals,
  loading,
  hasError = false,
}: RepPeriodTotalsProps) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground">Period totals</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sum of daily activity for the selected date range
        </p>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <div
                key={key}
                className="h-16 animate-pulse rounded-lg bg-secondary"
              />
            ))}
          </div>
        ) : null}

        {!loading && !hasError ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {METRIC_KEYS.map((key) => (
              <div
                key={key}
                className="rounded-lg border border-zinc-100 bg-secondary px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {LEADERBOARD_METRIC_LABELS[key]}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {totals[key]}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
