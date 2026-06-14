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
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Recent activity
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Latest field events</p>
        </div>
        <span
          className={`text-xs font-medium ${
            realtimeConnected ? "text-emerald-700" : "text-muted-foreground"
          }`}
        >
          {realtimeConnected ? "● Connected" : "○ Connecting…"}
        </span>
      </div>

      <div className="max-h-[420px] overflow-y-auto px-5 pb-5">
        {realtimeError ? (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            {realtimeError}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground ring-1 ring-border">
            {error}
          </p>
        ) : null}

        {loading && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : null}

        {!loading && items.length === 0 && !error ? (
          <p className="rounded-lg bg-secondary px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border">
            No field activity in this period
          </p>
        ) : null}

        {items.length > 0 ? (
          <ul className="divide-y divide-zinc-100">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg p-3 transition-colors hover:bg-secondary"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {item.rep_name}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatKnockHistoryDate(item.occurred_at)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.action_label}
                  </span>
                  {item.outcome ? (
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-semibold text-accent-foreground"
                      style={{
                        backgroundColor: DOOR_OUTCOME_COLORS[item.outcome],
                      }}
                    >
                      {DOOR_OUTCOME_LABELS[item.outcome]}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
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
