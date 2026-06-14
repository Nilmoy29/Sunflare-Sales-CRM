"use client";

import { useCallback } from "react";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import { geographicYieldToCsv } from "@/lib/csv/dashboard-export-mappers";
import { exportDashboardReport } from "@/lib/csv/export-dashboard-report";
import {
  formatInterestedPct,
  GEOGRAPHIC_YIELD_METRIC_OPTIONS,
  type GeographicYieldMetric,
  type RankedGeographicYieldRow,
} from "@/lib/validators/geographic-yield";

type GeographicYieldPanelProps = {
  metric: GeographicYieldMetric;
  rows: RankedGeographicYieldRow[];
  loading: boolean;
  error: string | null;
  onMetricChange: (metric: GeographicYieldMetric) => void;
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

function volumeValue(
  row: RankedGeographicYieldRow,
  metric: GeographicYieldMetric,
): number | null {
  if (metric === "interested_pct") {
    return row.interested_pct;
  }
  return row[metric];
}

function volumeBarWidthPercent(value: number | null, maxValue: number): number {
  if (value === null || value <= 0 || maxValue <= 0) {
    return 0;
  }
  return Math.max(4, Math.round((value / maxValue) * 100));
}

export function GeographicYieldPanel({
  metric,
  rows,
  loading,
  error,
  onMetricChange,
}: GeographicYieldPanelProps) {
  const { from, to } = useDashboardDateRange();
  const maxValue = rows.reduce((max, row) => {
    const value = volumeValue(row, metric);
    if (value === null || value <= 0) {
      return max;
    }
    return Math.max(max, value);
  }, 0);

  const handleExport = useCallback(() => {
    const { headers, rows: csvRows } = geographicYieldToCsv(rows);
    exportDashboardReport("geographic-yield", from, to, headers, csvRows);
  }, [from, rows, to]);

  const exportDisabled = loading || !!error || rows.length === 0;

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Geographic yield</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suburb conversion ranked by selected metric for the active date range
          </p>
        </div>
        <CsvExportButton disabled={exportDisabled} onExport={handleExport} />
      </div>

      <div className="p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {GEOGRAPHIC_YIELD_METRIC_OPTIONS.map((option) => {
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
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <div
                key={key}
                className="h-9 animate-pulse rounded bg-secondary"
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <p className="rounded-lg bg-secondary px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border">
            No knocks with suburb data in this period
          </p>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="pb-2 pr-4 w-16">
                    Rank
                  </th>
                  <th scope="col" className="pb-2 pr-4">
                    Suburb
                  </th>
                  <th scope="col" className="pb-2 pr-4 text-right">
                    Doors
                  </th>
                  <th scope="col" className="pb-2 pr-4 text-right">
                    Interested
                  </th>
                  <th scope="col" className="pb-2 pr-4 text-right">
                    Leads
                  </th>
                  <th scope="col" className="pb-2 pr-4 text-right">
                    Interested %
                  </th>
                  <th scope="col" className="pb-2">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => {
                  const value = volumeValue(row, metric);
                  const widthPercent = volumeBarWidthPercent(value, maxValue);

                  return (
                    <tr
                      key={row.suburb}
                      className={rankRowClassName(row.rank)}
                    >
                      <td className="py-2.5 pr-4 tabular-nums font-semibold text-foreground">
                        #{row.rank}
                      </td>
                      <th
                        scope="row"
                        className="py-2.5 pr-4 font-medium text-foreground"
                      >
                        {row.suburb}
                      </th>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">
                        {row.doors}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">
                        {row.interested}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">
                        {row.leads_added}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">
                        {formatInterestedPct(row.interested_pct)}
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
