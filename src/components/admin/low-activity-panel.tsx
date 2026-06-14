"use client";

import { formatKnockHistoryDate } from "@/features/knocks/format-knock-date";
import type { LowActivityRep } from "@/lib/validators/dashboard-coaching";

type LowActivityPanelProps = {
  flagged: LowActivityRep[];
  windowMinutes: number | null;
  loading: boolean;
  error: string | null;
};

export function LowActivityPanel({
  flagged,
  windowMinutes,
  loading,
  error,
}: LowActivityPanelProps) {
  const windowLabel =
    windowMinutes !== null ? `${windowMinutes} min window` : "60 min window";

  return (
    <section className="rounded-lg border border-border bg-card px-4 py-4">
      <h2 className="text-lg font-semibold text-foreground">Needs attention</h2>
      <p className="mt-1 text-sm text-muted-foreground">{windowLabel}</p>

      {error ? (
        <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground ring-1 ring-border">
          {error}
        </p>
      ) : null}

      {loading && flagged.length === 0 ? (
        <div className="mt-3 space-y-2">
          {[0, 1].map((key) => (
            <div key={key} className="h-8 animate-pulse rounded bg-secondary" />
          ))}
        </div>
      ) : null}

      {!loading && flagged.length === 0 && !error ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
          All reps active
        </p>
      ) : null}

      {flagged.length > 0 ? (
        <ul className="mt-3 divide-y divide-zinc-100">
          {flagged.map((rep) => (
            <li key={rep.rep_id} className="py-2 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-foreground">
                {rep.rep_name}
              </p>
              <p className="mt-0.5 text-sm text-amber-800">
                No activity for {rep.idle_minutes} min
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Shift started {formatKnockHistoryDate(rep.shift_started_at)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
