import {
  LEAD_STAGES,
  LOST_REASONS,
  type LeadStage,
  type LostReason,
} from "@sunflare/shared";
import type { LeadSource } from "@sunflare/shared";

export const PIPELINE_STAGE_ORDER = LEAD_STAGES;

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  knocked_called: "Knocked / Called",
  interested: "Interested",
  appointment_set: "Appointment set",
  pitched: "Pitched",
  proposal_sent: "Proposal sent",
  signed: "Signed",
  lost: "Lost",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  d2d: "D2D",
  call: "Call",
};

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  price: "Price",
  not_interested: "Not interested",
  competitor: "Competitor",
  no_response: "No response",
};

export { LOST_REASONS };

export const CALL_OUTCOME_LABELS: Record<string, string> = {
  answered_interested: "Answered — interested",
  answered_not_interested: "Answered — not interested",
  voicemail: "Voicemail",
  no_answer: "No answer",
  wrong_number: "Wrong number",
  callback_scheduled: "Callback scheduled",
};

export function formatStageChangeDisplay(
  fromStage: LeadStage,
  toStage: LeadStage,
  lostReason?: LostReason,
): string {
  const base = `${LEAD_STAGE_LABELS[fromStage]} → ${LEAD_STAGE_LABELS[toStage]}`;
  if (toStage === "lost" && lostReason) {
    return `${base} (${LOST_REASON_LABELS[lostReason]})`;
  }
  return base;
}

export function formatDisplayDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatNextActionCountdown(dueAt: string | null): string {
  if (!dueAt) {
    return "None scheduled";
  }

  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return "Due today";
  }
  if (diffDays === 1) {
    return "Due tomorrow";
  }
  if (diffDays > 1) {
    return `Due in ${diffDays}d`;
  }
  if (diffDays === -1) {
    return "Overdue 1d";
  }
  return `Overdue ${Math.abs(diffDays)}d`;
}

export function defaultRepPipelineFilters() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 30);

  const format = (d: Date) => d.toISOString().slice(0, 10);

  return {
    stages: null,
    repIds: null,
    sources: null,
    suburb: "",
    from: format(from),
    to: format(today),
  };
}
