"use client";

import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import {
  DOOR_OUTCOME_COLORS,
  DOOR_OUTCOME_LABELS,
} from "@/lib/geo/door-outcome-colors";
import type { RepShiftSummary } from "@/lib/validators/shifts";

type ShiftEndSummarySheetProps = {
  summary: RepShiftSummary;
  onDismiss: () => void;
};

function formatShare(count: number, total: number): string {
  if (total <= 0) {
    return "0%";
  }
  return `${Math.round((count / total) * 100)}%`;
}

export function ShiftEndSummarySheet({
  summary,
  onDismiss,
}: ShiftEndSummarySheetProps) {
  const isToday = summary.date === formatSydneyDateString(new Date());
  const subtitle = isToday ? "Today's shift" : summary.date;

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
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-zinc-300 bg-white p-4 sheet-bottom shadow-xl"
      >
        <h2
          id="shift-end-summary-title"
          className="text-lg font-semibold text-zinc-950"
        >
          Shift complete
        </h2>
        <p className="mt-1 text-sm text-zinc-800">{subtitle}</p>

        <div className="mt-4 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
            Doors knocked
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-950">
            {summary.doors}
          </p>
        </div>

        {summary.doors > 0 ? (
          <ul className="mt-4 space-y-2" aria-label="Door outcomes">
            {summary.door_outcomes.map((entry) => (
              <li
                key={entry.outcome}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: DOOR_OUTCOME_COLORS[entry.outcome],
                  }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 text-sm font-medium text-zinc-900">
                  {DOOR_OUTCOME_LABELS[entry.outcome]}
                </span>
                <span className="text-sm font-semibold tabular-nums text-zinc-950">
                  {entry.count}
                </span>
                <span className="w-10 text-right text-xs tabular-nums text-zinc-600">
                  {formatShare(entry.count, summary.doors)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-zinc-700">No doors logged this shift.</p>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-center">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
              Calls
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-zinc-950">
              {summary.calls}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-center">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
              Leads
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-zinc-950">
              {summary.leads_added}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-center">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
              Appts
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-zinc-950">
              {summary.appointments_set}
            </dd>
          </div>
        </dl>

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
