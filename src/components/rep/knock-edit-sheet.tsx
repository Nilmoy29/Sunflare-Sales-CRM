"use client";

import { useState } from "react";
import { updateKnock } from "@/features/knocks/api";
import {
  DOOR_OUTCOME_BUTTON_COLORS,
  DOOR_OUTCOME_LABELS,
} from "@/lib/geo/door-outcome-colors";
import type { DoorOutcome } from "@/lib/validators/enums";
import { DOOR_OUTCOMES } from "@/lib/validators/enums";
import {
  NOTES_MAX_LENGTH,
  type KnockHistoryItem,
} from "@/lib/validators/knocks";

type KnockEditSheetProps = {
  knock: KnockHistoryItem;
  onClose: () => void;
  onSaved: (knock: KnockHistoryItem) => void;
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

export function KnockEditSheet({
  knock,
  onClose,
  onSaved,
}: KnockEditSheetProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<DoorOutcome>(
    knock.outcome,
  );
  const [notes, setNotes] = useState(knock.notes ?? "");
  const [followUpLocal, setFollowUpLocal] = useState(
    toFollowUpLocalValue(knock.follow_up_at),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outcomeLocked = knock.has_linked_lead;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const followUp = parseFollowUpLocal(followUpLocal);
    if (!followUp.ok) {
      setError("Enter a valid follow-up date and time.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await updateKnock(knock.id, {
      outcome: selectedOutcome,
      notes: notes.trim() ? notes.trim() : null,
      follow_up_at: followUp.iso,
    });

    setSubmitting(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    onSaved(result.knock);
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
        aria-labelledby="knock-edit-sheet-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="knock-edit-sheet-title"
              className="text-lg font-semibold text-zinc-950"
            >
              Edit knock
            </h2>
            {knock.has_linked_lead ? (
              <p className="mt-1 text-sm text-amber-800">
                Linked to a pipeline lead — outcome cannot change away from
                Interested.
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
              {DOOR_OUTCOMES.map((outcome) => {
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
                      backgroundColor: DOOR_OUTCOME_BUTTON_COLORS[outcome],
                    }}
                    aria-pressed={selected}
                  >
                    {DOOR_OUTCOME_LABELS[outcome]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="block text-sm font-medium text-zinc-900">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={submitting}
              maxLength={NOTES_MAX_LENGTH}
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
