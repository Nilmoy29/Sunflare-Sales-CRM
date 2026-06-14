"use client";

import { useState } from "react";
import {
  LOST_REASON_LABELS,
  LOST_REASONS,
} from "@/lib/validators/lost-reasons";
import type { LostReason } from "@/lib/validators/enums";

type LostReasonDialogProps = {
  contactName: string;
  onConfirm: (lostReason: LostReason) => void;
  onCancel: () => void;
  submitting?: boolean;
};

export function LostReasonDialog({
  contactName,
  onConfirm,
  onCancel,
  submitting = false,
}: LostReasonDialogProps) {
  const [selected, setSelected] = useState<LostReason | null>(null);

  return (
    <div className="fixed inset-0 z-30">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cancel lost reason"
        onClick={() => {
          if (!submitting) {
            onCancel();
          }
        }}
        disabled={submitting}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lost-reason-dialog-title"
        className="fixed inset-x-4 top-1/2 z-40 mx-auto max-w-md -translate-y-1/2 rounded-xl bg-card p-4 shadow-xl ring-1 ring-border sm:inset-x-auto"
      >
        <h2
          id="lost-reason-dialog-title"
          className="text-lg font-semibold text-foreground"
        >
          Why was this lead lost?
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{contactName}</p>

        <fieldset className="mt-4 space-y-2" disabled={submitting}>
          <legend className="sr-only">Lost reason</legend>
          {LOST_REASONS.map((reason) => (
            <label
              key={reason}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50"
            >
              <input
                type="radio"
                name="lost_reason"
                value={reason}
                checked={selected === reason}
                onChange={() => setSelected(reason)}
                className="h-4 w-4 shrink-0"
              />
              <span className="text-sm text-foreground">
                {LOST_REASON_LABELS[reason]}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected || submitting}
            onClick={() => {
              if (selected) {
                onConfirm(selected);
              }
            }}
            className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-zinc-800 disabled:opacity-60"
          >
            {submitting ? "Moving…" : "Move to Lost"}
          </button>
        </div>
      </div>
    </div>
  );
}
