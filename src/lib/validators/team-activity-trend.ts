import { z } from "zod";
import {
  parseDashboardDateRangeSearchParams,
  sydneyDateStringSchema,
} from "@/lib/validators/dashboard-date-range";
import { repActivityTrendDaySchema } from "@/lib/validators/rep-deep-dive";

export const teamActivityTrendResponseSchema = z.object({
  from: sydneyDateStringSchema,
  to: sydneyDateStringSchema,
  days: z.array(repActivityTrendDaySchema),
});

export type TeamActivityTrendResponse = z.infer<
  typeof teamActivityTrendResponseSchema
>;

export function parseTeamActivityTrendSearchParams(
  searchParams: URLSearchParams,
) {
  return parseDashboardDateRangeSearchParams(searchParams);
}
