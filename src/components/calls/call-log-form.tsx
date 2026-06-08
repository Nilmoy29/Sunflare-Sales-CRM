"use client";

import { useState } from "react";
import { createCall } from "@/features/calls/api";
import {
  CALL_OUTCOME_BUTTON_COLORS,
  CALL_OUTCOME_LABELS,
  CALL_OUTCOMES,
} from "@/lib/call-outcome-labels";
import {
  CALL_DURATION_MINUTES_MAX,
  CALL_NOTES_MAX_LENGTH,
  type CallLogSummary,
} from "@/lib/validators/call-logs";
import type { CallOutcome } from "@/lib/validators/enums";

type CallLogFormProps = {
  contactId: string;
  onLogged: (call: CallLogSummary) => void;
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

export function CallLogForm({ contactId, onLogged }: CallLogFormProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(
    null,
  );
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpLocal, setFollowUpLocal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setSelectedOutcome(null);
    setDurationMinutes("");
    setNotes("");
    setFollowUpLocal("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedOutcome || submitting) {
      setError("Select a call outcome before logging.");
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
      setError(`Duration must be between 0 and ${CALL_DURATION_MINUTES_MAX} minutes.`);
      return;
    }

    const followUp = parseFollowUpLocal(followUpLocal);
    if (!followUp.ok) {
      setError("Enter a valid follow-up date and time.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await createCall({
      contact_id: contactId,
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

    resetForm();
    onLogged(result.call);
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-zinc-900">Outcome</legend>
        <div className="grid grid-cols-2 gap-2">
          {CALL_OUTCOMES.map((outcome) => {
            const selected = selectedOutcome === outcome;
            return (
              <button
                key={outcome}
                type="button"
                onClick={() => setSelectedOutcome(outcome)}
                disabled={submitting}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm ring-2 disabled:opacity-60 ${
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
          placeholder="e.g. 5"
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
          placeholder="Quick notes…"
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
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!selectedOutcome || submitting}
        className="min-h-11 w-full rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Logging…" : "Log call"}
      </button>
    </form>
  );
}
