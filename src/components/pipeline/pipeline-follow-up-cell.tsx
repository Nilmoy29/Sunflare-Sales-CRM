"use client";

import { useEffect, useState } from "react";
import {
  formatNextActionCountdown,
  formatPipelineDate,
} from "@/features/pipeline/format-pipeline-dates";
import { displayFollowUpNote } from "@/features/pipeline/display-follow-up-note";
import {
  parseOptionalFollowUpDatetimeLocal,
  toFollowUpDatetimeLocalValue,
} from "@/lib/validators/follow-ups";
import { NOTES_MAX_LENGTH } from "@/lib/validators/knocks";
import type { PipelineLeadCard } from "@/lib/validators/pipeline";

export type SaveFollowUpInput = {
  due_at: string | null;
  note: string;
  follow_up_id?: string | null;
};

type PipelineFollowUpCellProps = {
  lead: PipelineLeadCard;
  disabled?: boolean;
  onSave: (leadId: string, input: SaveFollowUpInput) => Promise<boolean>;
  onComplete: (leadId: string, followUpId: string) => Promise<boolean>;
};

function followUpStatusClass(dueAt: string | null): string {
  if (!dueAt) {
    return "bg-secondary text-muted-foreground";
  }

  const countdown = formatNextActionCountdown(dueAt);
  if (countdown.startsWith("Overdue")) {
    return "bg-red-500/15 text-red-400";
  }
  if (countdown === "Due today") {
    return "bg-amber-500/15 text-amber-400";
  }
  return "bg-accent/15 text-accent";
}

export function PipelineFollowUpCell({
  lead,
  disabled = false,
  onSave,
  onComplete,
}: PipelineFollowUpCellProps) {
  const [dueAtLocal, setDueAtLocal] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const followUpNote = displayFollowUpNote(
    lead.next_follow_up_note ?? lead.booking_notes,
  );
  const hasScheduledFollowUp = Boolean(
    lead.next_follow_up_id && lead.next_action_due_at,
  );

  useEffect(() => {
    setDueAtLocal(toFollowUpDatetimeLocalValue(lead.next_action_due_at));
    setNoteDraft("");
    setError(null);
  }, [lead.id, lead.next_action_due_at, lead.next_follow_up_id]);

  async function handleSave() {
    if (disabled || saving || completing) {
      return;
    }

    const note = noteDraft.trim();
    const parsedDue = parseOptionalFollowUpDatetimeLocal(dueAtLocal);
    if (!parsedDue.ok) {
      setError(parsedDue.message);
      return;
    }

    if (!note && !parsedDue.iso) {
      setError("Add a note or pick a follow-up date");
      return;
    }

    setSaving(true);
    setError(null);
    const ok = await onSave(lead.id, {
      due_at: parsedDue.iso,
      note,
      follow_up_id: lead.next_follow_up_id,
    });
    setSaving(false);
    if (ok) {
      setNoteDraft("");
    }
  }

  async function handleComplete() {
    if (
      disabled ||
      saving ||
      completing ||
      !lead.next_follow_up_id
    ) {
      return;
    }

    setCompleting(true);
    setError(null);
    const ok = await onComplete(lead.id, lead.next_follow_up_id);
    setCompleting(false);
    if (ok) {
      setDueAtLocal("");
      setNoteDraft("");
    }
  }

  return (
    <div className="min-w-[14rem] space-y-2">
      {hasScheduledFollowUp ? (
        <div className="space-y-1 rounded-md border border-border bg-secondary/30 p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${followUpStatusClass(lead.next_action_due_at)}`}
            >
              {formatNextActionCountdown(lead.next_action_due_at)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatPipelineDate(lead.next_action_due_at)}
            </span>
          </div>
          {followUpNote ? (
            <p className="text-xs text-foreground" title={followUpNote}>
              {followUpNote}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void handleComplete();
            }}
            disabled={disabled || saving || completing}
            className="text-xs font-semibold text-accent underline disabled:opacity-50"
          >
            {completing ? "Marking done…" : "Mark done"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/80">No follow-up scheduled</p>
      )}

      {lead.latest_note ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Last note</span>
          {lead.latest_note_at ? (
            <span> · {formatPipelineDate(lead.latest_note_at)}</span>
          ) : null}
          <span className="mt-0.5 block line-clamp-2" title={lead.latest_note}>
            {lead.latest_note}
          </span>
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label className="sr-only" htmlFor={`follow-up-date-${lead.id}`}>
          Follow-up date
        </label>
        <input
          id={`follow-up-date-${lead.id}`}
          type="datetime-local"
          value={dueAtLocal}
          onChange={(e) => {
            setDueAtLocal(e.target.value);
            if (error) {
              setError(null);
            }
          }}
          disabled={disabled || saving || completing}
          className="min-h-9 w-full rounded border border-border bg-card px-2 py-1 text-xs text-foreground"
        />
        <label className="sr-only" htmlFor={`follow-up-note-${lead.id}`}>
          Note
        </label>
        <textarea
          id={`follow-up-note-${lead.id}`}
          value={noteDraft}
          onChange={(e) => {
            setNoteDraft(e.target.value);
            if (error) {
              setError(null);
            }
          }}
          disabled={disabled || saving || completing}
          maxLength={NOTES_MAX_LENGTH}
          rows={2}
          placeholder="Note for follow-up or activity…"
          className="w-full rounded border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
        />
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={disabled || saving || completing}
          className="w-full rounded bg-secondary px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          {saving ? "Saving…" : hasScheduledFollowUp ? "Update follow-up" : "Save"}
        </button>
      </div>
    </div>
  );
}
