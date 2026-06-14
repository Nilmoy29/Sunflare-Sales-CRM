"use client";

import Link from "next/link";
import { useCallback } from "react";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import { teamLeaderboardToCsv } from "@/lib/csv/dashboard-export-mappers";
import { exportDashboardReport } from "@/lib/csv/export-dashboard-report";
import {
  LEADERBOARD_METRIC_LABELS,
  LEADERBOARD_METRIC_OPTIONS,
  type LeaderboardMetric,
  type LeaderboardRow,
} from "@/lib/validators/team-leaderboard";

type TeamLeaderboardProps = {
  metric: LeaderboardMetric;
  rows: LeaderboardRow[];
  loading: boolean;
  error: string | null;
  onMetricChange: (metric: LeaderboardMetric) => void;
};

function rankRowClassName(rank: number): string | undefined {
  if (rank === 1) {
    return "border-l-4 border-amber-400 bg-amber-50/60";
  }
  if (rank === 2 || rank === 3) {
    return "border-l-4 border-border bg-secondary/80";
  }
  return undefined;
}

export function TeamLeaderboard({
  metric,
  rows,
  loading,
  error,
  onMetricChange,
}: TeamLeaderboardProps) {
  const { from, to } = useDashboardDateRange();
  const metricLabel = LEADERBOARD_METRIC_LABELS[metric];

  const handleExport = useCallback(() => {
    const { headers, rows: csvRows } = teamLeaderboardToCsv(rows, metric);
    exportDashboardReport(
      `team-leaderboard-${metric}`,
      from,
      to,
      headers,
      csvRows,
    );
  }, [from, metric, rows, to]);

  const exportDisabled = loading || !!error || rows.length === 0;

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Team leaderboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked by selected metric for the active date range
          </p>
        </div>
        <CsvExportButton disabled={exportDisabled} onExport={handleExport} />
      </div>

      <div className="p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {LEADERBOARD_METRIC_OPTIONS.map((option) => {
            const active = metric === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onMetricChange(option.id)}
                className={
                  active
                    ? "rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
                    : "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary"
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground ring-1 ring-border">
            {error}
          </p>
        ) : null}

        {loading && !error ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((key) => (
              <div
                key={key}
                className="h-9 animate-pulse rounded bg-secondary"
              />
            ))}
          </div>
        ) : null}

        {!loading && rows.length === 0 && !error ? (
          <p className="rounded-lg bg-secondary px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border">
            No reps in the system
          </p>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="pb-2 pr-4 w-16">
                    Rank
                  </th>
                  <th scope="col" className="pb-2 pr-4">
                    Rep
                  </th>
                  <th scope="col" className="pb-2 text-right">
                    {metricLabel}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => (
                  <tr
                    key={row.rep_id}
                    className={rankRowClassName(row.rank)}
                  >
                    <td className="py-2.5 pr-4 tabular-nums font-semibold text-foreground">
                      #{row.rank}
                    </td>
                    <th
                      scope="row"
                      className="py-2.5 pr-4 font-medium text-foreground"
                    >
                      <Link
                        href={`/admin/reps/${row.rep_id}`}
                        className="underline decoration-zinc-300 underline-offset-2 hover:text-muted-foreground hover:decoration-zinc-500"
                      >
                        {row.rep_name}
                      </Link>
                    </th>
                    <td className="py-2.5 text-right tabular-nums text-foreground">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
