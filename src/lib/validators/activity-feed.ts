import { z } from "zod";
import { doorOutcomeSchema } from "@/lib/validators/enums";

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

export const activityFeedQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ACTIVITY_FEED_MAX_LIMIT)
    .default(ACTIVITY_FEED_DEFAULT_LIMIT),
});

export type ActivityFeedQuery = z.infer<typeof activityFeedQuerySchema>;

export function parseActivityFeedSearchParams(searchParams: URLSearchParams) {
  return activityFeedQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
  });
}
