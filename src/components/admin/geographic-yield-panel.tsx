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
    return "border-l-4 border-zinc-300 bg-zinc-50/80";
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
    <section className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Geographic yield</h2>
          <p className="mt-1 text-sm text-zinc-600">
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
                    ? "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
                    : "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 ring-1 ring-zinc-200">
            {error}
          </p>
        ) : null}

        {loading && !error ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <div
                key={key}
                className="h-9 animate-pulse rounded bg-zinc-100"
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <p className="rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 ring-1 ring-zinc-200">
            No knocks with suburb data in this period
          </p>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
                      <td className="py-2.5 pr-4 tabular-nums font-semibold text-zinc-900">
                        #{row.rank}
                      </td>
                      <th
                        scope="row"
                        className="py-2.5 pr-4 font-medium text-zinc-900"
                      >
                        {row.suburb}
                      </th>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-800">
                        {row.doors}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-800">
                        {row.interested}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-800">
                        {row.leads_added}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-800">
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
