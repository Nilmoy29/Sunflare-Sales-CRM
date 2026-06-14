"use client";

import { useState } from "react";
import { parseFollowUpDatetimeLocal } from "@/lib/validators/follow-ups";
import { NOTES_MAX_LENGTH } from "@/lib/validators/knocks";

type LeadFollowUpComposeProps = {
  onSubmit: (input: { due_at: string; note: string }) => Promise<void>;
  disabled?: boolean;
};

export function LeadFollowUpCompose({
  onSubmit,
  disabled = false,
}: LeadFollowUpComposeProps) {
  const [dueAtLocal, setDueAtLocal] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (disabled || submitting) {
      return;
    }

    const parsed = parseFollowUpDatetimeLocal(dueAtLocal);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        due_at: parsed.iso,
        note: note.trim(),
      });
      setDueAtLocal("");
      setNote("");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Could not schedule follow-up",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-2">
        <label
          htmlFor="lead-follow-up-due"
          className="text-sm font-medium text-foreground"
        >
          Due date and time
        </label>
        <input
          id="lead-follow-up-due"
          type="datetime-local"
          value={dueAtLocal}
          onChange={(e) => {
            setDueAtLocal(e.target.value);
            if (error) {
              setError(null);
            }
          }}
          disabled={disabled || submitting}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="lead-follow-up-note"
          className="text-sm font-medium text-foreground"
        >
          Note (optional)
        </label>
        <textarea
          id="lead-follow-up-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={disabled || submitting}
          maxLength={NOTES_MAX_LENGTH}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          placeholder="What to follow up on…"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          void handleSubmit();
        }}
        disabled={disabled || submitting}
        className="min-h-11 w-fit rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Scheduling…" : "Schedule follow-up"}
      </button>
    </div>
  );
}
