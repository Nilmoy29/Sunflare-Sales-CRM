import { z } from "zod";
import {
  countDaysInclusive,
  DASHBOARD_DATE_RANGE_MAX_DAYS,
  sydneyDateStringSchema,
} from "@/lib/validators/dashboard-date-range";

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
  from: sydneyDateStringSchema,
  to: sydneyDateStringSchema,
  rows: z.array(dailyRepSummaryRowSchema),
});

export type DailyRepSummaryResponse = z.infer<
  typeof dailyRepSummaryResponseSchema
>;

export const dailyRepSummaryQuerySchema = z
  .object({
    date: sydneyDateStringSchema.optional(),
    from: sydneyDateStringSchema.optional(),
    to: sydneyDateStringSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasLegacyDate = Boolean(value.date);
    const hasFrom = Boolean(value.from);
    const hasTo = Boolean(value.to);

    if (hasLegacyDate && (hasFrom || hasTo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either date or from/to, not both",
      });
      return;
    }

    if (hasFrom !== hasTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both from and to are required when filtering by date range",
      });
      return;
    }

    if (hasFrom && hasTo && value.from! > value.to!) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "from must be on or before to",
      });
      return;
    }

    if (hasFrom && hasTo) {
      const spanDays = countDaysInclusive(value.from!, value.to!);
      if (spanDays > DASHBOARD_DATE_RANGE_MAX_DAYS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Date range cannot exceed ${DASHBOARD_DATE_RANGE_MAX_DAYS} days`,
        });
      }
    }
  });

export type DailyRepSummaryQuery = z.infer<typeof dailyRepSummaryQuerySchema>;

export function parseDailyRepSummarySearchParams(
  searchParams: URLSearchParams,
) {
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  return dailyRepSummaryQuerySchema.safeParse({
    date: date && date.length > 0 ? date : undefined,
    from: from && from.length > 0 ? from : undefined,
    to: to && to.length > 0 ? to : undefined,
  });
}

export function resolveDailyRepSummaryRange(query: DailyRepSummaryQuery): {
  from: string;
  to: string;
} {
  if (query.from && query.to) {
    return { from: query.from, to: query.to };
  }
  if (query.date) {
    return { from: query.date, to: query.date };
  }
  throw new Error("Daily rep summary query requires date or from/to");
}
