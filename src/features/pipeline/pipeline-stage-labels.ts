import { LEAD_STAGES, type LeadStage, type LostReason } from "@/lib/validators/enums";
import { LOST_REASON_LABELS } from "@/lib/validators/lost-reasons";

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

export type ContactNameFields = {
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  suburb: string | null;
};

export function formatContactDisplayName(contact: ContactNameFields): string {
  const name = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
  if (name) {
    return name;
  }
  return "Unnamed contact";
}
