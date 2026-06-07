import { z } from "zod";

export const DASHBOARD_DATE_RANGE_MAX_DAYS = 366;

export const dashboardDatePresetSchema = z.enum([
  "today",
  "week",
  "month",
  "custom",
]);

export type DashboardDatePreset = z.infer<typeof dashboardDatePresetSchema>;

export const sydneyDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const dashboardDateRangeSchema = z.object({
  preset: dashboardDatePresetSchema,
  from: sydneyDateStringSchema,
  to: sydneyDateStringSchema,
  label: z.string(),
});

export type DashboardDateRange = z.infer<typeof dashboardDateRangeSchema>;

export const dashboardDateRangeQuerySchema = z
  .object({
    from: sydneyDateStringSchema.optional(),
    to: sydneyDateStringSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const { from, to } = value;
    if (!from && !to) {
      return;
    }
    if (!from || !to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both from and to are required when filtering by date range",
      });
      return;
    }
    if (from > to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "from must be on or before to",
      });
      return;
    }
    const spanDays = countDaysInclusive(from, to);
    if (spanDays > DASHBOARD_DATE_RANGE_MAX_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Date range cannot exceed ${DASHBOARD_DATE_RANGE_MAX_DAYS} days`,
      });
    }
  });

export type DashboardDateRangeQuery = z.infer<
  typeof dashboardDateRangeQuerySchema
>;

export function countDaysInclusive(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

export function parseDashboardDateRangeSearchParams(
  searchParams: URLSearchParams,
) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  return dashboardDateRangeQuerySchema.safeParse({
    from: from && from.length > 0 ? from : undefined,
    to: to && to.length > 0 ? to : undefined,
  });
}

export function validateCustomDashboardDateRange(
  from: string,
  to: string,
): { ok: true } | { ok: false; message: string } {
  if (from > to) {
    return {
      ok: false,
      message: "Start date must be on or before end date.",
    };
  }

  const spanDays = countDaysInclusive(from, to);
  if (spanDays > DASHBOARD_DATE_RANGE_MAX_DAYS) {
    return {
      ok: false,
      message: `Date range cannot exceed ${DASHBOARD_DATE_RANGE_MAX_DAYS} days.`,
    };
  }

  return { ok: true };
}
