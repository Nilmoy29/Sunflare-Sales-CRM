import { z } from "zod";
import {
  parseDashboardDateRangeSearchParams,
  sydneyDateStringSchema,
} from "@/lib/validators/dashboard-date-range";

const countSchema = z.coerce.number().int().nonnegative();

export const geographicYieldMetricSchema = z.enum([
  "interested_pct",
  "doors",
  "interested",
  "leads_added",
]);

export type GeographicYieldMetric = z.infer<typeof geographicYieldMetricSchema>;

export const GEOGRAPHIC_YIELD_METRIC_OPTIONS: {
  id: GeographicYieldMetric;
  label: string;
}[] = [
  { id: "interested_pct", label: "Interested %" },
  { id: "doors", label: "Doors" },
  { id: "interested", label: "Interested" },
  { id: "leads_added", label: "Leads" },
];

export const GEOGRAPHIC_YIELD_METRIC_LABELS: Record<
  GeographicYieldMetric,
  string
> = {
  interested_pct: "Interested %",
  doors: "Doors",
  interested: "Interested",
  leads_added: "Leads",
};

export const geographicYieldRowSchema = z.object({
  suburb: z.string().min(1),
  doors: countSchema,
  interested: countSchema,
  leads_added: countSchema,
});

export type GeographicYieldRow = z.infer<typeof geographicYieldRowSchema>;

export const rankedGeographicYieldRowSchema = geographicYieldRowSchema.extend({
  rank: z.number().int().positive(),
  interested_pct: z.number().int().min(0).max(100).nullable(),
  sort_value: z.number(),
});

export type RankedGeographicYieldRow = z.infer<
  typeof rankedGeographicYieldRowSchema
>;

export const geographicYieldResponseSchema = z.object({
  from: sydneyDateStringSchema,
  to: sydneyDateStringSchema,
  rows: z.array(geographicYieldRowSchema),
});

export type GeographicYieldResponse = z.infer<
  typeof geographicYieldResponseSchema
>;

export function parseGeographicYieldSearchParams(searchParams: URLSearchParams) {
  return parseDashboardDateRangeSearchParams(searchParams);
}

export function computeInterestedPct(
  doors: number,
  interested: number,
): number | null {
  if (doors <= 0) {
    return null;
  }
  return Math.round((interested / doors) * 100);
}

export function formatInterestedPct(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value}%`;
}
