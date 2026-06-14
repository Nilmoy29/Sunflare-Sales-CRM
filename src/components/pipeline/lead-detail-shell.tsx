"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { LeadContactEditForm } from "@/components/pipeline/lead-contact-edit-form";
import { LeadReassignControl } from "@/components/pipeline/lead-reassign-control";
import { LeadDetailTimeline } from "@/components/pipeline/lead-detail-timeline";
import type { PipelineFilterRep } from "@/components/pipeline/pipeline-filters";
import { createLeadFollowUp, createLeadNote, deleteLead } from "@/features/pipeline/api";
import { useLeadDetail } from "@/features/pipeline/use-lead-detail";
import { syncPushSubscriptionIfGranted } from "@/features/push/client-subscribe";

type LeadDetailShellProps = {
  leadId: string;
  backHref: string;
  backLabel: string;
  layout?: "mobile" | "desktop";
  showPushPrompt?: boolean;
  showReassign?: boolean;
  showDelete?: boolean;
  reps?: PipelineFilterRep[];
};

export function LeadDetailShell({
  leadId,
  backHref,
  backLabel,
  layout = "mobile",
  showPushPrompt = false,
  showReassign = false,
  showDelete = false,
  reps = [],
}: LeadDetailShellProps) {
  const router = useRouter();
  const { data, loading, reloading, error, reload } = useLeadDetail(leadId);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleAddNote = useCallback(
    async (content: string) => {
      await createLeadNote(leadId, content);
      reload();
    },
    [leadId, reload],
  );

  const handleScheduleFollowUp = useCallback(
    async (input: { due_at: string; note: string }) => {
      await createLeadFollowUp(leadId, input);
      if (showPushPrompt) {
        try {
          await syncPushSubscriptionIfGranted();
        } catch {
          // Optional sync — follow-up already saved; don't fail the compose flow.
        }
      }
      reload();
    },
    [leadId, reload, showPushPrompt],
  );

  const handleDelete = useCallback(async () => {
    if (!data || deleting) {
      return;
    }

    const label = data.lead.contact_name;
    if (
      !window.confirm(
        `Delete "${label}" from the pipeline? This removes the lead and its notes/follow-ups.`,
      )
    ) {
      return;
    }

    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteLead(leadId);
      router.push(backHref);
      router.refresh();
    } catch (e: unknown) {
      setDeleteError(
        e instanceof Error ? e.message : "Could not delete lead",
      );
      setDeleting(false);
    }
  }, [backHref, data, deleting, leadId, router]);

  return (
    <main
      className={`flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto bg-background p-4 ${
        layout === "desktop" ? "md:p-8" : "md:p-6"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-block min-h-11 text-sm font-medium text-muted-foreground underline hover:text-foreground"
        >
          ← {backLabel}
        </Link>
        {showDelete && data ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting || reloading}
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete customer"}
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading lead…
        </p>
      ) : null}

      {reloading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Updating…
        </p>
      ) : null}

      {!loading && !reloading && error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {deleteError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError}
        </p>
      ) : null}

      {data ? (
        <>
          <LeadContactEditForm
            lead={data.lead}
            disabled={reloading || deleting}
            onSaved={reload}
          />

          <LeadDetailTimeline
            timeline={data.timeline}
            onAddNote={handleAddNote}
            onScheduleFollowUp={handleScheduleFollowUp}
            followUpComposeDisabled={reloading}
            showPushPrompt={showPushPrompt}
          />

          {showReassign ? (
            <LeadReassignControl
              leadId={leadId}
              currentRepId={data.lead.rep_id}
              reps={reps}
              onReassigned={reload}
            />
          ) : null}
        </>
      ) : null}
    </main>
  );
}
