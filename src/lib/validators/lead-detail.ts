import { z } from "zod";
import { callLogSummarySchema } from "@/lib/validators/call-logs";
import {
  callOutcomeSchema,
  doorOutcomeSchema,
  leadSourceSchema,
  leadStageSchema,
  lostReasonSchema,
} from "@/lib/validators/enums";

export const leadDetailHeaderSchema = z.object({
  id: z.string().uuid(),
  stage: leadStageSchema,
  source: leadSourceSchema,
  rep_id: z.string().uuid(),
  rep_name: z.string(),
  contact_name: z.string(),
  address: z.string().nullable(),
  suburb: z.string().nullable(),
  phone: z.string().nullable(),
  created_at: z.string(),
  lost_reason: lostReasonSchema.nullable(),
});

export type LeadDetailHeader = z.infer<typeof leadDetailHeaderSchema>;

const timelineBaseSchema = z.object({
  id: z.string().uuid(),
  occurred_at: z.string(),
  rep_name: z.string(),
});

export const leadDetailKnockTimelineItemSchema = timelineBaseSchema.extend({
  kind: z.literal("knock"),
  outcome: doorOutcomeSchema,
  address: z.string().nullable(),
  suburb: z.string().nullable(),
  is_origin: z.boolean(),
});

export const leadDetailCallTimelineItemSchema = timelineBaseSchema.extend({
  kind: z.literal("call"),
  outcome: callOutcomeSchema,
  notes: z.string().nullable(),
  duration_seconds: z.number().int().nullable(),
});

export const contactCallHistoryItemSchema = callLogSummarySchema.extend({
  rep_name: z.string(),
});

export type ContactCallHistoryItem = z.infer<typeof contactCallHistoryItemSchema>;

export const contactCallHistoryResponseSchema = z.object({
  calls: z.array(contactCallHistoryItemSchema),
});

export type ContactCallHistoryResponse = z.infer<
  typeof contactCallHistoryResponseSchema
>;

export const leadDetailNoteTimelineItemSchema = timelineBaseSchema.extend({
  kind: z.literal("note"),
  content: z.string(),
});

export const leadDetailStageChangeTimelineItemSchema = timelineBaseSchema.extend({
  kind: z.literal("stage_change"),
  from_stage: leadStageSchema.optional(),
  to_stage: leadStageSchema.optional(),
  content: z.string(),
});

export const leadDetailFollowUpTimelineItemSchema = timelineBaseSchema.extend({
  kind: z.literal("follow_up"),
  due_at: z.string(),
  note: z.string(),
  completed: z.boolean(),
});

export const leadDetailTimelineItemSchema = z.discriminatedUnion("kind", [
  leadDetailKnockTimelineItemSchema,
  leadDetailCallTimelineItemSchema,
  leadDetailNoteTimelineItemSchema,
  leadDetailStageChangeTimelineItemSchema,
  leadDetailFollowUpTimelineItemSchema,
]);

export type LeadDetailTimelineItem = z.infer<
  typeof leadDetailTimelineItemSchema
>;

export const leadDetailResponseSchema = z.object({
  lead: leadDetailHeaderSchema,
  calls_available: z.boolean(),
  timeline: z.array(leadDetailTimelineItemSchema),
});

export type LeadDetailResponse = z.infer<typeof leadDetailResponseSchema>;
