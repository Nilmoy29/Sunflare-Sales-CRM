"use client";

import {
  formatKnockAddress,
  formatKnockHistoryDate,
} from "@/features/knocks/format-knock-date";
import type { useAdminActivityFeed } from "@/features/admin/use-admin-activity-feed";
import {
  DOOR_OUTCOME_COLORS,
  DOOR_OUTCOME_LABELS,
} from "@/lib/geo/door-outcome-colors";

type ActivityFeedProps = Pick<
  ReturnType<typeof useAdminActivityFeed>,
  "items" | "loading" | "error" | "realtimeConnected" | "realtimeError"
>;

export function ActivityFeed({
  items,
  loading,
  error,
  realtimeConnected,
  realtimeError,
}: ActivityFeedProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-zinc-900">Live activity</h2>
        <span
          className={`text-xs font-medium ${
            realtimeConnected ? "text-emerald-700" : "text-zinc-500"
          }`}
        >
          {realtimeConnected ? "● Connected" : "○ Connecting…"}
        </span>
      </div>

      <div className="max-h-[480px] overflow-y-auto p-4">
        {realtimeError ? (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            {realtimeError}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 ring-1 ring-zinc-200">
            {error}
          </p>
        ) : null}

        {loading && items.length === 0 ? (
          <p className="text-sm text-zinc-500">Loading activity…</p>
        ) : null}

        {!loading && items.length === 0 && !error ? (
          <p className="rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 ring-1 ring-zinc-200">
            No field activity today
          </p>
        ) : null}

        {items.length > 0 ? (
          <ul className="divide-y divide-zinc-100">
            {items.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.rep_name}
                  </p>
                  <span className="text-xs text-zinc-500">
                    {formatKnockHistoryDate(item.occurred_at)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-zinc-600">
                    {item.action_label}
                  </span>
                  {item.outcome ? (
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                      style={{
                        backgroundColor: DOOR_OUTCOME_COLORS[item.outcome],
                      }}
                    >
                      {DOOR_OUTCOME_LABELS[item.outcome]}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-zinc-700">
                  {formatKnockAddress(item)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
