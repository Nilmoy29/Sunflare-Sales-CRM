import { z } from "zod";

const sydneyDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const countSchema = z.coerce.number().int().nonnegative();

export const dailyRepSummaryRowSchema = z.object({
  rep_id: z.string().uuid(),
  rep_name: z.string(),
  doors: countSchema,
  calls: countSchema,
  leads_added: countSchema,
  appointments_set: countSchema,
});

export type DailyRepSummaryRow = z.infer<typeof dailyRepSummaryRowSchema>;

export const dailyRepSummaryResponseSchema = z.object({
  date: sydneyDateStringSchema,
  rows: z.array(dailyRepSummaryRowSchema),
});

export type DailyRepSummaryResponse = z.infer<
  typeof dailyRepSummaryResponseSchema
>;

export const dailyRepSummaryQuerySchema = z.object({
  date: sydneyDateStringSchema.optional(),
});

export type DailyRepSummaryQuery = z.infer<typeof dailyRepSummaryQuerySchema>;

export function parseDailyRepSummarySearchParams(
  searchParams: URLSearchParams,
) {
  const date = searchParams.get("date");
  return dailyRepSummaryQuerySchema.safeParse({
    date: date && date.length > 0 ? date : undefined,
  });
}
