import { z } from "zod";
import { leadSourceSchema, leadStageSchema } from "@/lib/validators/enums";

export {
  reassignLeadBodySchema,
  updateLeadStageBodySchema,
  type ReassignLeadBody,
  type UpdateLeadStageBody,
} from "@/lib/validators/lost-reasons";

const sydneyDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const pipelineLeadCardBaseSchema = z.object({
  id: z.string().uuid(),
  stage: leadStageSchema,
  source: leadSourceSchema,
  rep_id: z.string().uuid(),
  rep_name: z.string(),
  contact_name: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  suburb: z.string().nullable(),
  updated_at: z.string(),
});

export type PipelineLeadCardBase = z.infer<typeof pipelineLeadCardBaseSchema>;

export const pipelineLeadCardSchema = pipelineLeadCardBaseSchema.extend({
  last_touch_at: z.string(),
  next_action_due_at: z.string().nullable(),
  next_follow_up_id: z.string().uuid().nullable(),
  next_follow_up_note: z.string().nullable(),
  booked_at: z.string().nullable(),
  closer_name: z.string().nullable(),
  booking_notes: z.string().nullable(),
  proposal_sent_at: z.string().nullable(),
  latest_note: z.string().nullable(),
  latest_note_at: z.string().nullable(),
});

export type PipelineLeadCard = z.infer<typeof pipelineLeadCardSchema>;

export const pipelineLeadsResponseSchema = z.object({
  leads: z.array(pipelineLeadCardSchema),
});

export type PipelineLeadsResponse = z.infer<typeof pipelineLeadsResponseSchema>;

export const pipelineLeadsQuerySchema = z.object({
  stages: z.array(leadStageSchema).optional(),
  rep_ids: z.array(z.string().uuid()).optional(),
  sources: z.array(leadSourceSchema).optional(),
  suburb: z.string().optional(),
  from: sydneyDateSchema.optional(),
  to: sydneyDateSchema.optional(),
});

export type PipelineLeadsQuery = z.infer<typeof pipelineLeadsQuerySchema>;

export const pipelineFiltersSchema = z.object({
  stages: z.array(leadStageSchema).nullable(),
  repIds: z.array(z.string().uuid()).nullable(),
  sources: z.array(leadSourceSchema).nullable(),
  suburb: z.string(),
  from: sydneyDateSchema,
  to: sydneyDateSchema,
});

export type PipelineFilters = z.infer<typeof pipelineFiltersSchema>;

export const updateLeadStageResponseSchema = z.object({
  lead: pipelineLeadCardSchema,
});

export type UpdateLeadStageResponse = z.infer<
  typeof updateLeadStageResponseSchema
>;

export const reassignLeadResponseSchema = z.object({
  lead: pipelineLeadCardSchema,
});

export type ReassignLeadResponse = z.infer<typeof reassignLeadResponseSchema>;

export function pipelineFiltersToQuery(
  filters: PipelineFilters,
): PipelineLeadsQuery {
  const suburb = filters.suburb.trim();
  return {
    stages: filters.stages ?? undefined,
    rep_ids: filters.repIds ?? undefined,
    sources: filters.sources ?? undefined,
    suburb: suburb || undefined,
    from: filters.from,
    to: filters.to,
  };
}

export function parsePipelineLeadsQueryFromSearchParams(
  searchParams: URLSearchParams,
) {
  const splitCsv = (key: string) => {
    const value = searchParams.get(key);
    if (!value) {
      return undefined;
    }
    const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  };

  return pipelineLeadsQuerySchema.safeParse({
    stages: splitCsv("stages"),
    rep_ids: splitCsv("rep_ids"),
    sources: splitCsv("sources"),
    suburb: searchParams.get("suburb")?.trim() || undefined,
    from: searchParams.get("from")?.trim() || undefined,
    to: searchParams.get("to")?.trim() || undefined,
  });
}
