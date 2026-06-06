import { z } from "zod";

export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const pushSubscribeBodySchema = z.object({
  endpoint: z.string().url(),
  keys: pushSubscriptionKeysSchema,
});

export type PushSubscribeBody = z.infer<typeof pushSubscribeBodySchema>;

export const pushUnsubscribeBodySchema = z.object({
  endpoint: z.string().url(),
});

export type PushUnsubscribeBody = z.infer<typeof pushUnsubscribeBodySchema>;

export const pushSubscribeResponseSchema = z.object({
  subscribed: z.literal(true),
});

export type PushSubscribeResponse = z.infer<typeof pushSubscribeResponseSchema>;

export const followUpRemindersCronResponseSchema = z.object({
  sent: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
});

export type FollowUpRemindersCronResponse = z.infer<
  typeof followUpRemindersCronResponseSchema
>;
