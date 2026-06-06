"use client";

import Link from "next/link";
import { useCallback } from "react";
import { LeadReassignControl } from "@/components/pipeline/lead-reassign-control";
import { LeadDetailTimeline } from "@/components/pipeline/lead-detail-timeline";
import type { PipelineFilterRep } from "@/components/pipeline/pipeline-filters";
import { createLeadFollowUp, createLeadNote } from "@/features/pipeline/api";
import { formatLastTouchDate } from "@/features/pipeline/format-pipeline-dates";
import { useLeadDetail } from "@/features/pipeline/use-lead-detail";
import {
  LEAD_SOURCE_BADGE_CLASS,
  LEAD_SOURCE_LABELS,
} from "@/features/pipeline/pipeline-source-labels";
import { LEAD_STAGE_LABELS } from "@/features/pipeline/pipeline-stage-labels";
import { LOST_REASON_LABELS } from "@/lib/validators/lost-reasons";
import { syncPushSubscriptionIfGranted } from "@/features/push/client-subscribe";

type LeadDetailShellProps = {
  leadId: string;
  backHref: string;
  backLabel: string;
  layout?: "mobile" | "desktop";
  showPushPrompt?: boolean;
  showReassign?: boolean;
  reps?: PipelineFilterRep[];
};

export function LeadDetailShell({
  leadId,
  backHref,
  backLabel,
  layout = "mobile",
  showPushPrompt = false,
  showReassign = false,
  reps = [],
}: LeadDetailShellProps) {
  const { data, loading, reloading, error, reload } = useLeadDetail(leadId);

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

  return (
    <main
      className={`flex flex-1 flex-col gap-6 p-4 ${
        layout === "desktop" ? "md:p-8" : "md:p-6"
      }`}
    >
      <div>
        <Link
          href={backHref}
          className="inline-block min-h-11 text-sm font-medium text-zinc-700 underline"
        >
          ← {backLabel}
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-600" role="status">
          Loading lead…
        </p>
      ) : null}

      {reloading ? (
        <p className="text-sm text-zinc-500" role="status">
          Updating…
        </p>
      ) : null}

      {!loading && !reloading && error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <header className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-zinc-900">
                  {data.lead.contact_name}
                </h1>
                {data.lead.address ? (
                  <p className="mt-1 text-sm text-zinc-600">{data.lead.address}</p>
                ) : null}
                {data.lead.suburb ? (
                  <p className="mt-0.5 text-sm text-zinc-500">{data.lead.suburb}</p>
                ) : null}
              </div>
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${LEAD_SOURCE_BADGE_CLASS[data.lead.source]}`}
              >
                {LEAD_SOURCE_LABELS[data.lead.source]}
              </span>
            </div>

            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Stage</dt>
                <dd className="font-medium text-zinc-900">
                  {LEAD_STAGE_LABELS[data.lead.stage]}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Owner</dt>
                <dd className="font-medium text-zinc-900">{data.lead.rep_name}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Created</dt>
                <dd className="font-medium text-zinc-900">
                  {formatLastTouchDate(data.lead.created_at)}
                </dd>
              </div>
              {data.lead.phone ? (
                <div>
                  <dt className="text-zinc-500">Phone</dt>
                  <dd className="font-medium text-zinc-900">{data.lead.phone}</dd>
                </div>
              ) : null}
              {data.lead.stage === "lost" && data.lead.lost_reason ? (
                <div>
                  <dt className="text-zinc-500">Lost reason</dt>
                  <dd className="font-medium text-zinc-900">
                    {LOST_REASON_LABELS[data.lead.lost_reason]}
                  </dd>
                </div>
              ) : null}
            </dl>
          </header>

          {showReassign ? (
            <LeadReassignControl
              leadId={leadId}
              currentRepId={data.lead.rep_id}
              reps={reps}
              onReassigned={reload}
            />
          ) : null}

          <LeadDetailTimeline
            timeline={data.timeline}
            callsAvailable={data.calls_available}
            onAddNote={handleAddNote}
            onScheduleFollowUp={handleScheduleFollowUp}
            followUpComposeDisabled={reloading}
            showPushPrompt={showPushPrompt}
          />
        </>
      ) : null}
    </main>
  );
}
