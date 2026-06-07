"use client";

import { formatKnockHistoryDate } from "@/features/knocks/format-knock-date";
import { CALL_OUTCOME_LABELS } from "@/lib/call-outcome-labels";
import { formatCallDurationMinutes } from "@/lib/validators/call-logs";
import type { ContactCallHistoryItem } from "@/lib/validators/lead-detail";

type ContactCallHistoryProps = {
  calls: ContactCallHistoryItem[];
  loading?: boolean;
  error?: string | null;
};

function CallHistoryCard({ call }: { call: ContactCallHistoryItem }) {
  const duration = formatCallDurationMinutes(call.duration_seconds);
  const metaParts = [
    call.rep_name,
    formatKnockHistoryDate(call.called_at),
    duration,
  ].filter(Boolean);

  return (
    <li className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-zinc-900">
          {CALL_OUTCOME_LABELS[call.outcome]}
        </p>
        <p className="text-xs text-zinc-500">{metaParts.join(" · ")}</p>
      </div>
      {call.notes ? (
        <p className="mt-2 text-sm text-zinc-700">{call.notes}</p>
      ) : null}
    </li>
  );
}

export function ContactCallHistory({
  calls,
  loading = false,
  error = null,
}: ContactCallHistoryProps) {
  return (
    <section className="mt-6 flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-zinc-900">Call history</h3>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading call history…</p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && calls.length === 0 ? (
        <p className="text-sm text-zinc-500">No calls logged yet.</p>
      ) : null}

      {!loading && !error && calls.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {calls.map((call) => (
            <CallHistoryCard key={call.id} call={call} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
