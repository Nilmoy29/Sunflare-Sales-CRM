import { z } from "zod";
import {
  parseDashboardDateRangeSearchParams,
  sydneyDateStringSchema,
} from "@/lib/validators/dashboard-date-range";

export const funnelStageKeySchema = z.enum([
  "interacted",
  "interested",
  "appointment_set",
  "pitched",
  "closed_won",
]);

export type FunnelStageKey = z.infer<typeof funnelStageKeySchema>;

export const funnelStageRowSchema = z.object({
  stage_key: funnelStageKeySchema,
  label: z.string(),
  sort_order: z.number().int().positive(),
  count: z.coerce.number().int().nonnegative(),
});

export type FunnelStageRow = z.infer<typeof funnelStageRowSchema>;

export const funnelConversionResponseSchema = z.object({
  from: sydneyDateStringSchema,
  to: sydneyDateStringSchema,
  stages: z.array(funnelStageRowSchema),
});

export type FunnelConversionResponse = z.infer<
  typeof funnelConversionResponseSchema
>;

export function parseFunnelConversionSearchParams(searchParams: URLSearchParams) {
  return parseDashboardDateRangeSearchParams(searchParams);
}
