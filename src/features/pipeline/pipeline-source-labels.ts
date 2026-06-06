import type { LeadSource } from "@/lib/validators/enums";

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  d2d: "D2D",
  call: "Call",
};

export const LEAD_SOURCE_BADGE_CLASS: Record<LeadSource, string> = {
  d2d: "bg-emerald-50 text-emerald-800",
  call: "bg-sky-50 text-sky-800",
};
