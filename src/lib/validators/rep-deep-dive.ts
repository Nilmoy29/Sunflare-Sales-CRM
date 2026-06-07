import { z } from "zod";
import {
  parseDashboardDateRangeSearchParams,
  sydneyDateStringSchema,
} from "@/lib/validators/dashboard-date-range";
import { leadStageSchema } from "@/lib/validators/enums";

const countSchema = z.coerce.number().int().nonnegative();

export const repIdParamSchema = z.string().uuid();

export const repActivityTrendDaySchema = z.object({
  activity_date: sydneyDateStringSchema,
  doors: countSchema,
  calls: countSchema,
  leads_added: countSchema,
  appointments_set: countSchema,
});

export type RepActivityTrendDay = z.infer<typeof repActivityTrendDaySchema>;

export const repActivityTrendResponseSchema = z.object({
  rep_id: repIdParamSchema,
  from: sydneyDateStringSchema,
  to: sydneyDateStringSchema,
  days: z.array(repActivityTrendDaySchema),
});

export type RepActivityTrendResponse = z.infer<
  typeof repActivityTrendResponseSchema
>;

export const repPipelineStageRowSchema = z.object({
  stage_key: leadStageSchema,
  label: z.string(),
  sort_order: z.number().int().positive(),
  count: countSchema,
});

export type RepPipelineStageRow = z.infer<typeof repPipelineStageRowSchema>;

export const repPipelineSnapshotResponseSchema = z.object({
  rep_id: repIdParamSchema,
  stages: z.array(repPipelineStageRowSchema),
});

export type RepPipelineSnapshotResponse = z.infer<
  typeof repPipelineSnapshotResponseSchema
>;

export function parseRepActivityTrendSearchParams(
  searchParams: URLSearchParams,
) {
  return parseDashboardDateRangeSearchParams(searchParams);
}
