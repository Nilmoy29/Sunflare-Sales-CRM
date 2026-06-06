import { z } from "zod";
import { leadDetailNoteTimelineItemSchema } from "@/lib/validators/lead-detail";
import {
  leadActivityTypeSchema,
  leadStageSchema,
  type LeadStage,
} from "@/lib/validators/enums";
import { NOTES_MAX_LENGTH } from "@/lib/validators/knocks";

export const stageChangeActivityContentSchema = z.object({
  from_stage: leadStageSchema,
  to_stage: leadStageSchema,
});

export type StageChangeActivityContent = z.infer<
  typeof stageChangeActivityContentSchema
>;

export function serializeStageChangeContent(
  fromStage: LeadStage,
  toStage: LeadStage,
): string {
  return JSON.stringify({
    from_stage: fromStage,
    to_stage: toStage,
  } satisfies StageChangeActivityContent);
}

export function parseStageChangeContent(
  content: string,
): StageChangeActivityContent | null {
  try {
    const parsed = stageChangeActivityContentSchema.safeParse(
      JSON.parse(content),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const leadActivityRowSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid(),
  actor_id: z.string().uuid(),
  type: leadActivityTypeSchema,
  content: z.string(),
  created_at: z.string(),
});

export type LeadActivityRow = z.infer<typeof leadActivityRowSchema>;

export const createLeadNoteBodySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Note cannot be empty")
    .max(NOTES_MAX_LENGTH, `Note must be at most ${NOTES_MAX_LENGTH} characters`),
});

export type CreateLeadNoteBody = z.infer<typeof createLeadNoteBodySchema>;

export const createLeadNoteResponseSchema = z.object({
  note: leadDetailNoteTimelineItemSchema,
});

export type CreateLeadNoteResponse = z.infer<
  typeof createLeadNoteResponseSchema
>;
