"use client";

import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import { addDaysSydney } from "@/features/dashboard/resolve-dashboard-date-range";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import type { DashboardDatePreset } from "@/lib/validators/dashboard-date-range";
import { DASHBOARD_DATE_RANGE_MAX_DAYS } from "@/lib/validators/dashboard-date-range";

const PRESETS: { id: DashboardDatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom" },
];

export function DashboardDateRangeControl() {
  const {
    preset,
    customFrom,
    customTo,
    label,
    customRangeError,
    setPreset,
    setCustomRange,
  } = useDashboardDateRange();
  const today = formatSydneyDateString(new Date());
  const minFrom = addDaysSydney(
    customTo || today,
    -(DASHBOARD_DATE_RANGE_MAX_DAYS - 1),
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((item) => {
          const active = preset === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPreset(item.id)}
              className={
                active
                  ? "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {preset === "custom" ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">From</span>
            <input
              type="date"
              value={customFrom}
              min={minFrom}
              max={customTo || today}
              onChange={(event) => {
                const nextFrom = event.target.value;
                if (!nextFrom) {
                  return;
                }
                setCustomRange(nextFrom, customTo);
              }}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">To</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={today}
              onChange={(event) => {
                const nextTo = event.target.value;
                if (!nextTo) {
                  return;
                }
                setCustomRange(customFrom, nextTo);
              }}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
        </div>
      ) : null}

      {customRangeError ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {customRangeError}
        </p>
      ) : null}

      <p className="mt-3 text-sm text-zinc-600">{label}</p>
    </div>
  );
}
