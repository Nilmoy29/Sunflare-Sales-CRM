"use client";

import { useState } from "react";
import { updateCall } from "@/features/calls/api";
import {
  CALL_OUTCOME_BUTTON_COLORS,
  CALL_OUTCOME_LABELS,
  CALL_OUTCOMES,
} from "@/lib/call-outcome-labels";
import {
  CALL_DURATION_MINUTES_MAX,
  CALL_NOTES_MAX_LENGTH,
} from "@/lib/validators/call-logs";
import type { CallOutcome } from "@/lib/validators/enums";
import type { ContactCallHistoryItem } from "@/lib/validators/lead-detail";

type CallEditSheetProps = {
  call: ContactCallHistoryItem;
  onClose: () => void;
  onSaved: (call: ContactCallHistoryItem) => void;
};

function parseFollowUpLocal(
  value: string,
): { ok: true; iso: string | null } | { ok: false } {
  if (!value.trim()) {
    return { ok: true, iso: null };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false };
  }
  return { ok: true, iso: date.toISOString() };
}

function toFollowUpLocalValue(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDurationMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    return Number.NaN;
  }
  return parsed;
}

function durationMinutesFromSeconds(seconds: number | null): string {
  if (seconds === null || seconds <= 0) {
    return "";
  }
  return String(Math.max(1, Math.round(seconds / 60)));
}

export function CallEditSheet({ call, onClose, onSaved }: CallEditSheetProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome>(
    call.outcome,
  );
  const [durationMinutes, setDurationMinutes] = useState(
    durationMinutesFromSeconds(call.duration_seconds),
  );
  const [notes, setNotes] = useState(call.notes ?? "");
  const [followUpLocal, setFollowUpLocal] = useState(
    toFollowUpLocalValue(call.follow_up_at),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outcomeLocked = call.has_linked_lead;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const duration = parseDurationMinutes(durationMinutes);
    if (Number.isNaN(duration)) {
      setError("Enter a valid duration in minutes.");
      return;
    }
    if (
      duration !== null &&
      (duration < 0 || duration > CALL_DURATION_MINUTES_MAX)
    ) {
      setError(
        `Duration must be between 0 and ${CALL_DURATION_MINUTES_MAX} minutes.`,
      );
      return;
    }

    const followUp = parseFollowUpLocal(followUpLocal);
    if (!followUp.ok) {
      setError("Enter a valid follow-up date and time.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await updateCall(call.id, {
      outcome: selectedOutcome,
      duration_minutes: duration,
      notes: notes.trim() ? notes.trim() : null,
      follow_up_at: followUp.iso,
    });

    setSubmitting(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    onSaved(result.call);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-labelledby="call-edit-sheet-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="call-edit-sheet-title"
              className="text-lg font-semibold text-zinc-950"
            >
              Edit call
            </h2>
            {call.has_linked_lead ? (
              <p className="mt-1 text-sm text-amber-800">
                Linked to a pipeline lead — outcome cannot change away from
                Answered – Interested.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
            aria-label="Close"
          >
            <span aria-hidden className="text-2xl leading-none">
              ×
            </span>
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <fieldset className="space-y-3" disabled={outcomeLocked}>
            <legend className="text-sm font-medium text-zinc-900">Outcome</legend>
            <div className="grid grid-cols-2 gap-2">
              {CALL_OUTCOMES.map((outcome) => {
                const selected = selectedOutcome === outcome;
                return (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => setSelectedOutcome(outcome)}
                    disabled={submitting || outcomeLocked}
                    className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-white ring-2 disabled:opacity-60 ${
                      selected ? "ring-zinc-950" : "ring-zinc-300"
                    }`}
                    style={{
                      backgroundColor: CALL_OUTCOME_BUTTON_COLORS[outcome],
                    }}
                    aria-pressed={selected}
                  >
                    {CALL_OUTCOME_LABELS[outcome]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="block text-sm font-medium text-zinc-900">
            Duration (minutes, optional)
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={CALL_DURATION_MINUTES_MAX}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              disabled={submitting}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-200 px-3 text-base text-zinc-900"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-900">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={submitting}
              maxLength={CALL_NOTES_MAX_LENGTH}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-900">
            Follow-up (optional)
            <input
              type="datetime-local"
              value={followUpLocal}
              onChange={(event) => setFollowUpLocal(event.target.value)}
              disabled={submitting}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm text-zinc-900"
            />
          </label>

          {error ? (
            <p
              className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
