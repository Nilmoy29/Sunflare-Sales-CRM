"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LostReasonDialog } from "@/components/pipeline/lost-reason-dialog";
import { PipelineFollowUpCell } from "@/components/pipeline/pipeline-follow-up-cell";
import { PipelineLatestUpdateCell } from "@/components/pipeline/pipeline-latest-update-cell";
import type { PipelineListView } from "@/components/pipeline/pipeline-view-toggle";
import {
  filterOverdueFollowUpLeads,
  sortLeadsByBookedDate,
  sortLeadsByOverdueDue,
} from "@/features/pipeline/latest-update-display";
import {
  leadStageRowBorderStyle,
  LEAD_STAGE_UNDERLINE_COLOR,
} from "@/features/pipeline/pipeline-stage-colors";
import { formatPipelineDate } from "@/features/pipeline/format-pipeline-dates";
import {
  LEAD_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
} from "@/features/pipeline/pipeline-stage-labels";
import type { MoveLeadStageOptions } from "@/features/pipeline/use-pipeline-leads";
import { LEAD_STAGES, type LeadStage, type LostReason } from "@/lib/validators/enums";
import type { PipelineLeadCard } from "@/lib/validators/pipeline";

type PipelineTableProps = {
  leads: PipelineLeadCard[];
  loading: boolean;
  error: string | null;
  listView: PipelineListView;
  showRepName: boolean;
  detailBasePath: string;
  onStageChange: (
    leadId: string,
    stage: LeadStage,
    options?: MoveLeadStageOptions,
  ) => Promise<boolean>;
  onSaveFollowUp: (
    leadId: string,
    input: { due_at: string | null; note: string },
  ) => Promise<boolean>;
  onCompleteFollowUp: (leadId: string, followUpId: string) => Promise<boolean>;
  allowDelete?: boolean;
  onDeleteLead?: (leadId: string) => Promise<boolean>;
};

type PendingLostMove = {
  leadId: string;
  lead: PipelineLeadCard;
};

const PROPOSAL_SENT_STAGES: LeadStage[] = ["proposal_sent", "signed"];

function formatAddress(lead: PipelineLeadCard): string {
  const parts = [lead.address, lead.suburb].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function isProposalSent(lead: PipelineLeadCard): boolean {
  return PROPOSAL_SENT_STAGES.includes(lead.stage);
}

export function PipelineTable({
  leads,
  loading,
  error,
  listView,
  showRepName,
  detailBasePath,
  onStageChange,
  onSaveFollowUp,
  onCompleteFollowUp,
  allowDelete = false,
  onDeleteLead,
}: PipelineTableProps) {
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [pendingLost, setPendingLost] = useState<PendingLostMove | null>(null);

  const isOverdueView = listView === "overdue_follow_ups";

  const sortedLeads = useMemo(() => {
    const filtered = isOverdueView
      ? filterOverdueFollowUpLeads(leads)
      : leads;
    return isOverdueView
      ? sortLeadsByOverdueDue(filtered)
      : sortLeadsByBookedDate(filtered);
  }, [isOverdueView, leads]);

  async function handleStageSelect(lead: PipelineLeadCard, newStage: LeadStage) {
    if (newStage === lead.stage || updatingLeadId) {
      return;
    }

    if (newStage === "lost") {
      setPendingLost({ leadId: lead.id, lead });
      return;
    }

    setUpdatingLeadId(lead.id);
    try {
      await onStageChange(lead.id, newStage);
    } finally {
      setUpdatingLeadId(null);
    }
  }

  async function handleLostConfirm(lostReason: LostReason) {
    if (!pendingLost || updatingLeadId) {
      return;
    }

    setUpdatingLeadId(pendingLost.leadId);
    try {
      const ok = await onStageChange(pendingLost.leadId, "lost", {
        lost_reason: lostReason,
      });
      if (ok) {
        setPendingLost(null);
      }
    } finally {
      setUpdatingLeadId(null);
    }
  }

  async function handleMarkProposalSent(lead: PipelineLeadCard) {
    if (isProposalSent(lead) || updatingLeadId) {
      return;
    }

    setUpdatingLeadId(lead.id);
    try {
      await onStageChange(lead.id, "proposal_sent");
    } finally {
      setUpdatingLeadId(null);
    }
  }

  async function handleDeleteLead(leadId: string, contactName: string) {
    if (!onDeleteLead || deletingLeadId) {
      return;
    }

    if (
      !window.confirm(
        `Delete "${contactName}" from the pipeline? This removes the lead and its notes/follow-ups.`,
      )
    ) {
      return;
    }

    setDeletingLeadId(leadId);
    try {
      await onDeleteLead(leadId);
    } finally {
      setDeletingLeadId(null);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading leads…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table
            className={`w-full border-separate border-spacing-0 text-left text-sm ${
              isOverdueView ? "min-w-[62rem]" : "min-w-[56rem]"
            }`}
          >
            <thead>
              <tr className="border-b border-border bg-secondary/60">
                <th className="sticky left-0 z-10 bg-secondary/95 px-3 py-3 font-semibold text-foreground">
                  Customer
                </th>
                <th className="px-3 py-3 font-semibold text-foreground">Address</th>
                {showRepName ? (
                  <th className="px-3 py-3 font-semibold text-foreground">Owner</th>
                ) : null}
                <th className="px-3 py-3 font-semibold text-foreground">Status</th>
                <th className="px-3 py-3 font-semibold text-foreground">Booked</th>
                <th className="px-3 py-3 font-semibold text-foreground">Closer</th>
                <th className="px-3 py-3 font-semibold text-foreground">
                  Proposal sent
                </th>
                <th className="px-3 py-3 font-semibold text-foreground">
                  {isOverdueView ? "Follow-up" : "Latest update"}
                </th>
                <th className="px-3 py-3 font-semibold text-foreground">Update</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={showRepName ? 9 : 8}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    {isOverdueView
                      ? "No overdue follow-ups. You're all caught up."
                      : "No leads match your filters."}
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead) => {
                  const rowBusy =
                    updatingLeadId === lead.id || deletingLeadId === lead.id;
                  const rowBorderStyle = leadStageRowBorderStyle(lead.stage);

                  return (
                    <tr
                      key={lead.id}
                      className="align-top hover:bg-secondary/20"
                    >
                      <td
                        style={rowBorderStyle}
                        className="sticky left-0 z-10 bg-card px-3 py-3"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {lead.contact_name}
                          </p>
                          {lead.phone ? (
                            <p className="text-xs text-muted-foreground">
                              {lead.phone}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td
                        style={rowBorderStyle}
                        className="px-3 py-3 text-muted-foreground"
                      >
                        {formatAddress(lead)}
                      </td>
                      {showRepName ? (
                        <td
                          style={rowBorderStyle}
                          className="px-3 py-3 text-muted-foreground"
                        >
                          {lead.rep_name}
                        </td>
                      ) : null}
                      <td style={rowBorderStyle} className="px-3 py-3">
                        <select
                          key={`${lead.id}-${lead.stage}-${pendingLost?.leadId === lead.id ? "lost-dialog" : "ready"}`}
                          value={lead.stage}
                          disabled={rowBusy}
                          onChange={(e) => {
                            const value = e.target.value;
                            if ((LEAD_STAGES as readonly string[]).includes(value)) {
                              void handleStageSelect(lead, value as LeadStage);
                            }
                          }}
                          className="min-h-9 w-full min-w-[9rem] rounded border border-border bg-card px-2 py-1 text-xs font-medium text-foreground disabled:opacity-60"
                          aria-label={`Status for ${lead.contact_name}`}
                        >
                          {PIPELINE_STAGE_ORDER.map((stage) => (
                            <option key={stage} value={stage}>
                              {LEAD_STAGE_LABELS[stage]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        style={rowBorderStyle}
                        className="whitespace-nowrap px-3 py-3 text-muted-foreground"
                      >
                        {formatPipelineDate(lead.booked_at)}
                      </td>
                      <td
                        style={rowBorderStyle}
                        className="px-3 py-3 text-muted-foreground"
                      >
                        {lead.closer_name ?? "—"}
                      </td>
                      <td style={rowBorderStyle} className="px-3 py-3">
                        {isProposalSent(lead) ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Sent
                            {lead.proposal_sent_at ? (
                              <span className="font-normal text-emerald-600">
                                {formatPipelineDate(lead.proposal_sent_at)}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              void handleMarkProposalSent(lead);
                            }}
                            disabled={rowBusy}
                            className="rounded border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
                          >
                            Mark sent
                          </button>
                        )}
                      </td>
                      <td style={rowBorderStyle} className="px-3 py-3">
                        {isOverdueView ? (
                          <PipelineFollowUpCell
                            lead={lead}
                            disabled={rowBusy}
                            onSave={onSaveFollowUp}
                            onComplete={onCompleteFollowUp}
                          />
                        ) : (
                          <PipelineLatestUpdateCell lead={lead} />
                        )}
                      </td>
                      <td style={rowBorderStyle} className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`${detailBasePath}/${lead.id}`}
                            className="text-xs font-semibold text-accent underline"
                          >
                            Details
                          </Link>
                          {allowDelete && onDeleteLead ? (
                            <button
                              type="button"
                              onClick={() => {
                                void handleDeleteLead(lead.id, lead.contact_name);
                              }}
                              disabled={rowBusy}
                              className="text-left text-xs font-semibold text-destructive hover:underline disabled:opacity-60"
                            >
                              {deletingLeadId === lead.id ? "Deleting…" : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {sortedLeads.length} lead{sortedLeads.length === 1 ? "" : "s"}
        </p>
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1"
          aria-label="Status color key"
        >
          {PIPELINE_STAGE_ORDER.map((stage) => (
            <span
              key={stage}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className="inline-block h-0.5 w-4 rounded-full"
                style={{ backgroundColor: LEAD_STAGE_UNDERLINE_COLOR[stage] }}
                aria-hidden
              />
              {LEAD_STAGE_LABELS[stage]}
            </span>
          ))}
        </div>
      </div>

      {pendingLost ? (
        <LostReasonDialog
          contactName={pendingLost.lead.contact_name}
          submitting={updatingLeadId === pendingLost.leadId}
          onCancel={() => {
            if (updatingLeadId !== pendingLost.leadId) {
              setPendingLost(null);
            }
          }}
          onConfirm={(lostReason) => {
            void handleLostConfirm(lostReason);
          }}
        />
      ) : null}
    </div>
  );
}
