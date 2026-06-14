"use client";

import { useState } from "react";
import type { PipelineFilterRep } from "@/components/pipeline/pipeline-filters";
import { reassignLead } from "@/features/pipeline/api";

type LeadReassignControlProps = {
  leadId: string;
  currentRepId: string;
  reps: PipelineFilterRep[];
  onReassigned: () => void;
};

export function LeadReassignControl({
  leadId,
  currentRepId,
  reps,
  onReassigned,
}: LeadReassignControlProps) {
  const [selectedRepId, setSelectedRepId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged =
    !selectedRepId || selectedRepId === currentRepId;

  async function handleReassign() {
    if (unchanged || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await reassignLead(leadId, selectedRepId);
      setSelectedRepId("");
      onReassigned();
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Could not reassign lead",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (reps.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Reassign owner</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Transfer this lead and open follow-ups to another rep.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={selectedRepId}
          onChange={(e) => setSelectedRepId(e.target.value)}
          disabled={submitting}
          className="min-h-11 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
          aria-label="Select new owner"
        >
          <option value="">Select rep…</option>
          {reps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
              {rep.id === currentRepId ? " (current)" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            void handleReassign();
          }}
          disabled={unchanged || submitting}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting ? "Reassigning…" : "Reassign"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-700">{error}</p>
      ) : null}
    </section>
  );
}
