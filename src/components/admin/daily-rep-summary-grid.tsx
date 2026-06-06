"use client";

import { useDailyRepSummary } from "@/features/admin/use-daily-rep-summary";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";

const COLUMNS = [
  { key: "doors", short: "D", label: "Doors knocked" },
  { key: "calls", short: "C", label: "Calls made" },
  { key: "leads_added", short: "L", label: "Leads added" },
  { key: "appointments_set", short: "A", label: "Appointments set" },
] as const;

type DailyRepSummaryGridProps = {
  flaggedRepIds?: ReadonlySet<string>;
};

export function DailyRepSummaryGrid({
  flaggedRepIds,
}: DailyRepSummaryGridProps) {
  const { date, setDate, rows, loading, error } = useDailyRepSummary();
  const today = formatSydneyDateString(new Date());
  const highlightToday = date === today;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-zinc-900">Daily rep summary</h2>
        <label className="mt-3 block">
          <span className="sr-only">Summary date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => {
              const next = event.target.value;
              if (!next) {
                return;
              }
              setDate(next);
            }}
            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
          />
        </label>
      </div>

      <div className="p-4">
        {error ? (
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 ring-1 ring-zinc-200">
            {error}
          </p>
        ) : null}

        {loading && rows.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2].map((key) => (
              <div
                key={key}
                className="h-8 animate-pulse rounded bg-zinc-100"
              />
            ))}
          </div>
        ) : null}

        {!loading && rows.length === 0 && !error ? (
          <p className="rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 ring-1 ring-zinc-200">
            No reps in the system
          </p>
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
                    highlightToday && flaggedRepIds?.has(row.rep_id);
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
                      className="py-2 pr-2 font-medium text-zinc-900"
                    >
                      {row.rep_name}
                    </th>
                    <td className="py-2 px-1 text-center tabular-nums text-zinc-800">
                      {row.doors}
                    </td>
                    <td className="py-2 px-1 text-center tabular-nums text-zinc-800">
                      {row.calls}
                    </td>
                    <td className="py-2 px-1 text-center tabular-nums text-zinc-800">
                      {row.leads_added}
                    </td>
                    <td className="py-2 px-1 text-center tabular-nums text-zinc-800">
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
