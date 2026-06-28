import type { CSSProperties } from "react";
import type { LeadStage } from "@/lib/validators/enums";

/** Hex underline color per pipeline stage — used for row borders in the table. */
export const LEAD_STAGE_UNDERLINE_COLOR: Record<LeadStage, string> = {
  knocked_called: "#94a3b8",
  interested: "#22c55e",
  appointment_set: "#3b82f6",
  pitched: "#8b5cf6",
  proposal_sent: "#f59e0b",
  signed: "#34d399",
  lost: "#ef4444",
};

export function leadStageRowBorderStyle(stage: LeadStage): CSSProperties {
  return {
    borderBottom: `3px solid ${LEAD_STAGE_UNDERLINE_COLOR[stage]}`,
  };
}
