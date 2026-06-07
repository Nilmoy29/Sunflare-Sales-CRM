import { z } from "zod";
import { doorOutcomeSchema } from "@/lib/validators/enums";
import {
  countDaysInclusive,
  DASHBOARD_DATE_RANGE_MAX_DAYS,
  parseDashboardDateRangeSearchParams,
  sydneyDateStringSchema,
} from "@/lib/validators/dashboard-date-range";

export const ACTIVITY_FEED_DEFAULT_LIMIT = 50;
export const ACTIVITY_FEED_MAX_LIMIT = 100;
export const ACTIVITY_FEED_MAX_ITEMS = 100;

export const activityFeedItemTypeSchema = z.enum(["door_knock", "call"]);

export type ActivityFeedItemType = z.infer<typeof activityFeedItemTypeSchema>;

export const activityFeedItemSchema = z.object({
  id: z.string().uuid(),
  type: activityFeedItemTypeSchema,
  rep_id: z.string().uuid(),
  rep_name: z.string(),
  occurred_at: z.string(),
  action_label: z.string(),
  outcome: doorOutcomeSchema.nullable(),
  address: z.string().nullable(),
  suburb: z.string().nullable(),
  postcode: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
});

export type ActivityFeedItem = z.infer<typeof activityFeedItemSchema>;

export const activityFeedResponseSchema = z.object({
  items: z.array(activityFeedItemSchema),
});

export type ActivityFeedResponse = z.infer<typeof activityFeedResponseSchema>;

export const activityFeedQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(ACTIVITY_FEED_MAX_LIMIT)
      .default(ACTIVITY_FEED_DEFAULT_LIMIT),
    from: sydneyDateStringSchema.optional(),
    to: sydneyDateStringSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasFrom = Boolean(value.from);
    const hasTo = Boolean(value.to);

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

export type ActivityFeedQuery = z.infer<typeof activityFeedQuerySchema>;

export function parseActivityFeedSearchParams(searchParams: URLSearchParams) {
  const rangeParsed = parseDashboardDateRangeSearchParams(searchParams);
  if (!rangeParsed.success) {
    return rangeParsed;
  }

  return activityFeedQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    from: rangeParsed.data.from,
    to: rangeParsed.data.to,
  });
}
