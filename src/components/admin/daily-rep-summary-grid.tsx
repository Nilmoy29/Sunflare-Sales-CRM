"use client";

import Link from "next/link";
import { useCallback } from "react";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import { dailyRepSummaryToCsv } from "@/lib/csv/dashboard-export-mappers";
import { exportDashboardReport } from "@/lib/csv/export-dashboard-report";
import type { DailyRepSummaryRow } from "@/lib/validators/daily-rep-summary";

const COLUMNS = [
  { key: "doors", short: "D", label: "Doors knocked" },
  { key: "calls", short: "C", label: "Calls made" },
  { key: "leads_added", short: "L", label: "Leads added" },
  { key: "appointments_set", short: "A", label: "Appointments set" },
] as const;

type DailyRepSummaryGridProps = {
  flaggedRepIds?: ReadonlySet<string>;
  rows: DailyRepSummaryRow[];
  loading: boolean;
  error: string | null;
};

export function DailyRepSummaryGrid({
  flaggedRepIds,
  rows,
  loading,
  error,
}: DailyRepSummaryGridProps) {
  const { from, to, label, isToday } = useDashboardDateRange();
  const isSingleDay = from === to;
  const title = isSingleDay ? "Daily rep summary" : "Rep summary";

  const handleExport = useCallback(() => {
    const { headers, rows: csvRows } = dailyRepSummaryToCsv(rows);
    exportDashboardReport("daily-rep-summary", from, to, headers, csvRows);
  }, [from, rows, to]);

  const exportDisabled = loading || !!error || rows.length === 0;

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {!isSingleDay ? (
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          ) : null}
        </div>
        <CsvExportButton disabled={exportDisabled} onExport={handleExport} />
      </div>

      <div className="p-4">
        {error ? (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground ring-1 ring-border">
            {error}
          </p>
        ) : null}

        {loading && rows.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2].map((key) => (
              <div
                key={key}
                className="h-8 animate-pulse rounded bg-secondary"
              />
            ))}
          </div>
        ) : null}

        {!loading && rows.length === 0 && !error ? (
          <p className="rounded-lg bg-secondary px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border">
            No reps in the system
          </p>
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="pb-2 pr-2">
                    Rep
                  </th>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      title={column.label}
                      className="pb-2 px-1 text-center"
                    >
                      <span className="sm:hidden">{column.short}</span>
                      <span className="hidden sm:inline">
                        {column.key === "leads_added"
                          ? "Leads"
                          : column.key === "appointments_set"
                            ? "Appts"
                            : column.label.replace(" knocked", "").replace(" made", "").replace(" added", "").replace(" set", "")}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => {
                  const isFlagged =
                    isToday && flaggedRepIds?.has(row.rep_id);
                  return (
                  <tr
                    key={row.rep_id}
                    className={
                      isFlagged
                        ? "border-l-4 border-amber-400 bg-amber-50"
                        : undefined
                    }
                  >
                    <th
                      scope="row"
                      className="py-2 pr-2 font-medium text-foreground"
                    >
                      <Link
                        href={`/admin/reps/${row.rep_id}`}
                        className="underline decoration-zinc-300 underline-offset-2 hover:text-muted-foreground hover:decoration-zinc-500"
                      >
                        {row.rep_name}
                      </Link>
                    </th>
                    <td className="py-2 px-1 text-center tabular-nums text-foreground">
                      {row.doors}
                    </td>
                    <td className="py-2 px-1 text-center tabular-nums text-foreground">
                      {row.calls}
                    </td>
                    <td className="py-2 px-1 text-center tabular-nums text-foreground">
                      {row.leads_added}
                    </td>
                    <td className="py-2 px-1 text-center tabular-nums text-foreground">
                      {row.appointments_set}
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
