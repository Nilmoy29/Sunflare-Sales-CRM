"use client";

import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import type { RepDailySummary } from "@/lib/validators/shifts";

type ShiftEndSummarySheetProps = {
  summary: RepDailySummary;
  onDismiss: () => void;
};

export function ShiftEndSummarySheet({
  summary,
  onDismiss,
}: ShiftEndSummarySheetProps) {
  const isToday = summary.date === formatSydneyDateString(new Date());
  const subtitle = isToday ? "Today's summary" : summary.date;

  return (
    <div className="fixed inset-0 z-20">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close shift summary"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-end-summary-title"
        className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-white p-4 pb-8 shadow-xl ring-1 ring-zinc-200"
      >
        <h2
          id="shift-end-summary-title"
          className="text-lg font-semibold text-zinc-900"
        >
          Shift complete
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Doors
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
              {summary.doors}
            </dd>
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Calls
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
              {summary.calls}
            </dd>
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Leads
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
              {summary.leads_added}
            </dd>
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Appts
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
              {summary.appointments_set}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-sm text-zinc-600">
          {summary.doors} doors · {summary.calls} calls · {summary.leads_added}{" "}
          leads · {summary.appointments_set} appts
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Done
        </button>
      </div>
    </div>
  );
}
