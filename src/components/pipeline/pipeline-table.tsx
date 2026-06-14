"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LostReasonDialog } from "@/components/pipeline/lost-reason-dialog";
import { formatPipelineDate } from "@/features/pipeline/format-pipeline-dates";
import {
  LEAD_SOURCE_BADGE_CLASS,
  LEAD_SOURCE_LABELS,
} from "@/features/pipeline/pipeline-source-labels";
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
  showRepName: boolean;
  detailBasePath: string;
  onStageChange: (
    leadId: string,
    stage: LeadStage,
    options?: MoveLeadStageOptions,
  ) => Promise<boolean>;
  onAddNote: (leadId: string, content: string) => Promise<boolean>;
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

function PipelineNoteCell({
  lead,
  onAddNote,
}: {
  lead: PipelineLeadCard;
  onAddNote: (leadId: string, content: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleSave() {
    const content = draft.trim();
    if (!content || saving) {
      return;
    }
    setSaving(true);
    const ok = await onAddNote(lead.id, content);
    setSaving(false);
    if (ok) {
      setDraft("");
      setExpanded(false);
    }
  }

  return (
    <div className="min-w-[12rem] space-y-1">
      {lead.latest_note ? (
        <p
          className={`text-xs text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}
          title={lead.latest_note}
        >
          {lead.latest_note}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/70">No notes yet</p>
      )}
      {lead.latest_note && lead.latest_note.length > 60 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="text-xs font-medium text-accent underline"
        >
          {expanded ? "Less" : "More"}
        </button>
      ) : null}
      <div className="flex gap-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add note…"
          disabled={saving}
          className="min-h-9 flex-1 rounded border border-border bg-card px-2 py-1 text-xs text-foreground"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSave();
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={saving || !draft.trim()}
          className="shrink-0 rounded bg-secondary px-2 py-1 text-xs font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          {saving ? "…" : "Add"}
        </button>
      </div>
    </div>
  );
}

export function PipelineTable({
  leads,
  loading,
  error,
  showRepName,
  detailBasePath,
  onStageChange,
  onAddNote,
  allowDelete = false,
  onDeleteLead,
}: PipelineTableProps) {
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [pendingLost, setPendingLost] = useState<PendingLostMove | null>(null);

  const sortedLeads = useMemo(
    () =>
      [...leads].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [leads],
  );

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
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
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
                <th className="px-3 py-3 font-semibold text-foreground">
                  Proposal sent
                </th>
                <th className="px-3 py-3 font-semibold text-foreground">Notes</th>
                <th className="px-3 py-3 font-semibold text-foreground">Update</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={showRepName ? 8 : 7}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    No leads match your filters.
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead) => {
                  const rowBusy =
                    updatingLeadId === lead.id || deletingLeadId === lead.id;

                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-border/70 align-top hover:bg-secondary/20"
                    >
                      <td className="sticky left-0 z-10 bg-card px-3 py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {lead.contact_name}
                          </p>
                          {lead.phone ? (
                            <p className="text-xs text-muted-foreground">
                              {lead.phone}
                            </p>
                          ) : null}
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${LEAD_SOURCE_BADGE_CLASS[lead.source]}`}
                          >
                            {LEAD_SOURCE_LABELS[lead.source]}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatAddress(lead)}
                      </td>
                      {showRepName ? (
                        <td className="px-3 py-3 text-muted-foreground">
                          {lead.rep_name}
                        </td>
                      ) : null}
                      <td className="px-3 py-3">
                        <select
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
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                        {formatPipelineDate(lead.booked_at)}
                      </td>
                      <td className="px-3 py-3">
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
                      <td className="px-3 py-3">
                        <PipelineNoteCell lead={lead} onAddNote={onAddNote} />
                      </td>
                      <td className="px-3 py-3">
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

      <p className="text-xs text-muted-foreground">
        {sortedLeads.length} lead{sortedLeads.length === 1 ? "" : "s"}
      </p>

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
