import { z } from "zod";

const sydneyDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const shiftBreadcrumbPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  recorded_at: z.string(),
});

export type ShiftBreadcrumbPoint = z.infer<typeof shiftBreadcrumbPointSchema>;

export const shiftBreadcrumbShiftSchema = z.object({
  id: z.string().uuid(),
  rep_id: z.string().uuid(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
});

export type ShiftBreadcrumbShift = z.infer<typeof shiftBreadcrumbShiftSchema>;

export const shiftBreadcrumbsResponseSchema = z.object({
  shift: shiftBreadcrumbShiftSchema.nullable(),
  points: z.array(shiftBreadcrumbPointSchema),
});

export type ShiftBreadcrumbsResponse = z.infer<
  typeof shiftBreadcrumbsResponseSchema
>;

export const shiftBreadcrumbsQuerySchema = z.object({
  rep_id: z.string().uuid(),
  date: sydneyDateStringSchema,
});

export type ShiftBreadcrumbsQuery = z.infer<typeof shiftBreadcrumbsQuerySchema>;

export function parseShiftBreadcrumbsSearchParams(
  searchParams: URLSearchParams,
) {
  return shiftBreadcrumbsQuerySchema.safeParse({
    rep_id: searchParams.get("rep_id"),
    date: searchParams.get("date"),
  });
}
