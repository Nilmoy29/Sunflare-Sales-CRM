"use client";

import Link from "next/link";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { useCallback } from "react";
import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import { teamLeaderboardToCsv } from "@/lib/csv/dashboard-export-mappers";
import { exportDashboardReport } from "@/lib/csv/export-dashboard-report";
import {
  LEADERBOARD_METRIC_LABELS,
  LEADERBOARD_METRIC_OPTIONS,
  type LeaderboardMetric,
  type LeaderboardRow,
} from "@/lib/validators/team-leaderboard";

type DashboardTopPerformersProps = {
  metric: LeaderboardMetric;
  rows: LeaderboardRow[];
  loading: boolean;
  error: string | null;
  onMetricChange: (metric: LeaderboardMetric) => void;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function DashboardTopPerformers({
  metric,
  rows,
  loading,
  error,
  onMetricChange,
}: DashboardTopPerformersProps) {
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
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Top performers
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ranked by {metricLabel.toLowerCase()}
          </p>
        </div>
        <CsvExportButton disabled={exportDisabled} onExport={handleExport} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {LEADERBOARD_METRIC_OPTIONS.map((option) => {
          const active = metric === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onMetricChange(option.id)}
              aria-pressed={active}
              className={
                active
                  ? "rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
                  : "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
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
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((key) => (
            <div key={key} className="h-14 animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
      ) : null}

      {!loading && rows.length === 0 && !error ? (
        <p className="rounded-lg bg-secondary px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-border">
          No reps in the system
        </p>
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="space-y-2">
          {rows.slice(0, 5).map((row) => (
            <Link
              key={row.rep_id}
              href={`/admin/reps/${row.rep_id}`}
              className="group flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-secondary"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent/80 to-chart-1 text-xs font-semibold text-accent-foreground">
                    {initials(row.rep_name)}
                  </div>
                  {row.rank <= 3 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-background">
                      {row.rank}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground group-hover:underline">
                    {row.rep_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Rank #{row.rank}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {row.value}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
