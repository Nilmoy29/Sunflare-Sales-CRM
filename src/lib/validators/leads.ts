import { z } from "zod";
import { leadSourceSchema, leadStageSchema } from "@/lib/validators/enums";

export const PROMOTABLE_DOOR_OUTCOMES = [
  "interested",
  "callback_requested",
] as const;

export const promotableDoorOutcomeSchema = z.enum(PROMOTABLE_DOOR_OUTCOMES);

export type PromotableDoorOutcome = z.infer<typeof promotableDoorOutcomeSchema>;

export function isPromotableDoorOutcome(
  outcome: string,
): outcome is PromotableDoorOutcome {
  return promotableDoorOutcomeSchema.safeParse(outcome).success;
}

export const PROMOTABLE_CALL_OUTCOMES = [
  "answered_interested",
  "callback_scheduled",
] as const;

export const promotableCallOutcomeSchema = z.enum(PROMOTABLE_CALL_OUTCOMES);

export type PromotableCallOutcome = z.infer<typeof promotableCallOutcomeSchema>;

export function isPromotableCallOutcome(
  outcome: string,
): outcome is PromotableCallOutcome {
  return promotableCallOutcomeSchema.safeParse(outcome).success;
}

export const leadSummarySchema = z.object({
  id: z.string().uuid(),
  stage: leadStageSchema,
  source: leadSourceSchema,
});

export type LeadSummary = z.infer<typeof leadSummarySchema>;

export const leadRowSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid(),
  rep_id: z.string().uuid(),
  source: leadSourceSchema,
  stage: leadStageSchema,
  door_knock_id: z.string().uuid().nullable(),
  call_log_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type LeadRow = z.infer<typeof leadRowSchema>;

export const promoteCallResponseSchema = z.object({
  lead: leadSummarySchema,
  created: z.boolean(),
});

export type PromoteCallResponse = z.infer<typeof promoteCallResponseSchema>;
