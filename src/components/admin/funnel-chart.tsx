"use client";

import { useCallback } from "react";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import { funnelConversionToCsv } from "@/lib/csv/dashboard-export-mappers";
import { exportDashboardReport } from "@/lib/csv/export-dashboard-report";
import type { FunnelStageRow } from "@/lib/validators/funnel-conversion";

type FunnelChartProps = {
  stages: FunnelStageRow[];
  loading: boolean;
  error: string | null;
};

function formatConversionRate(
  count: number,
  previousCount: number,
  previousLabel: string,
): string | null {
  if (previousCount <= 0) {
    return null;
  }
  const rate = Math.round((count / previousCount) * 100);
  return `${rate}% from ${previousLabel}`;
}

export function FunnelChart({ stages, loading, error }: FunnelChartProps) {
  const { from, to } = useDashboardDateRange();
  const maxCount = stages.reduce((max, stage) => Math.max(max, stage.count), 0);
  const totalLeads = stages[0]?.count ?? 0;
  const isEmpty = !loading && !error && totalLeads === 0;

  const handleExport = useCallback(() => {
    const { headers, rows: csvRows } = funnelConversionToCsv(stages);
    exportDashboardReport("funnel-conversion", from, to, headers, csvRows);
  }, [from, stages, to]);

  const exportDisabled =
    loading || !!error || stages.length === 0 || totalLeads === 0;

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Funnel conversion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Leads created in the selected period
          </p>
        </div>
        <CsvExportButton disabled={exportDisabled} onExport={handleExport} />
      </div>

      <div className="p-4">
        {error ? (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground ring-1 ring-border">
            {error}
          </p>
        ) : null}

        {loading && !error ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((key) => (
              <div
                key={key}
                className="h-10 animate-pulse rounded bg-secondary"
              />
            ))}
          </div>
        ) : null}

        {isEmpty ? (
          <p className="rounded-lg bg-secondary px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border">
            No leads in this period
          </p>
        ) : null}

        {!loading && stages.length > 0 && totalLeads > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="pb-2 pr-4">
                    Stage
                  </th>
                  <th scope="col" className="pb-2 pr-4 text-right">
                    Count
                  </th>
                  <th scope="col" className="pb-2">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {stages.map((stage, index) => {
                  const previousStage = index > 0 ? stages[index - 1] : null;
                  const conversionNote =
                    previousStage
                      ? formatConversionRate(
                          stage.count,
                          previousStage.count,
                          previousStage.label,
                        )
                      : null;
                  const widthPercent =
                    maxCount > 0
                      ? Math.max(4, Math.round((stage.count / maxCount) * 100))
                      : 0;

                  return (
                    <tr key={stage.stage_key}>
                      <th
                        scope="row"
                        className="py-3 pr-4 font-medium text-foreground"
                      >
                        <div>{stage.label}</div>
                        {conversionNote ? (
                          <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                            {conversionNote}
                          </div>
                        ) : null}
                      </th>
                      <td className="py-3 pr-4 text-right tabular-nums text-foreground">
                        {stage.count}
                      </td>
                      <td className="py-3">
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
