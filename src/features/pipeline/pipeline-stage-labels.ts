import { LEAD_STAGES, type LeadStage } from "@/lib/validators/enums";

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
): string {
  return `${LEAD_STAGE_LABELS[fromStage]} → ${LEAD_STAGE_LABELS[toStage]}`;
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
    .join(" ")
    .trim();
  if (name) {
    return name;
  }
  if (contact.address) {
    return contact.address;
  }
  return contact.suburb ?? "Unknown contact";
}
