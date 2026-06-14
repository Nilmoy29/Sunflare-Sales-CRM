"use client";

import { startOfDaySydney } from "@/features/knocks/format-knock-date";
import {
  LEADERBOARD_METRIC_LABELS,
  LEADERBOARD_METRIC_OPTIONS,
  type LeaderboardMetric,
} from "@/lib/validators/team-leaderboard";

type TrendRow = {
  activity_date: string;
  value: number;
};

type RepActivityTrendChartProps = {
  metric: LeaderboardMetric;
  rows: TrendRow[];
  loading: boolean;
  error: string | null;
  onMetricChange: (metric: LeaderboardMetric) => void;
};

function formatTrendDate(dateStr: string): string {
  const date = new Date(startOfDaySydney(dateStr));
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function RepActivityTrendChart({
  metric,
  rows,
  loading,
  error,
  onMetricChange,
}: RepActivityTrendChartProps) {
  const metricLabel = LEADERBOARD_METRIC_LABELS[metric];
  const maxValue = rows.reduce((max, row) => Math.max(max, row.value), 0);

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground">Activity trend</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily {metricLabel.toLowerCase()} for the selected date range
        </p>
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
            {[0, 1, 2, 3, 4, 5, 6].map((key) => (
              <div
                key={key}
                className="h-9 animate-pulse rounded bg-secondary"
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <p className="rounded-lg bg-secondary px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border">
            No days in this range
          </p>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="pb-2 pr-4">
                    Date
                  </th>
                  <th scope="col" className="pb-2 pr-4 text-right">
                    {metricLabel}
                  </th>
                  <th scope="col" className="pb-2">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => {
                  const widthPercent =
                    maxValue > 0
                      ? Math.max(4, Math.round((row.value / maxValue) * 100))
                      : 0;

                  return (
                    <tr key={row.activity_date}>
                      <th
                        scope="row"
                        className="py-2.5 pr-4 font-medium text-foreground"
                      >
                        {formatTrendDate(row.activity_date)}
                      </th>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">
                        {row.value}
                      </td>
                      <td className="py-2.5">
                        <div
                          className="h-3 rounded bg-zinc-800"
                          style={{ width: `${widthPercent}%` }}
                          role="presentation"
                          aria-hidden="true"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
