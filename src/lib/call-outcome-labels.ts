import type { CallOutcome } from "@/lib/validators/enums";
import { CALL_OUTCOMES } from "@/lib/validators/enums";

export const CALL_OUTCOME_LABELS = {
  answered_interested: "Answered – Interested",
  answered_not_interested: "Answered – Not Interested",
  voicemail: "Voicemail",
  no_answer: "No Answer",
  wrong_number: "Wrong Number",
  callback_scheduled: "Callback Scheduled",
} as const satisfies Record<CallOutcome, string>;

export const CALL_OUTCOME_COLORS = {
  answered_interested: "#22c55e",
  answered_not_interested: "#ef4444",
  voicemail: "#eab308",
  no_answer: "#64748b",
  wrong_number: "#f97316",
  callback_scheduled: "#3b82f6",
} as const satisfies Record<CallOutcome, string>;

/** Darker shades for buttons — white label text meets contrast outdoors. */
export const CALL_OUTCOME_BUTTON_COLORS = {
  answered_interested: "#15803d",
  answered_not_interested: "#b91c1c",
  voicemail: "#a16207",
  no_answer: "#475569",
  wrong_number: "#c2410c",
  callback_scheduled: "#1d4ed8",
} as const satisfies Record<CallOutcome, string>;

export { CALL_OUTCOMES };
