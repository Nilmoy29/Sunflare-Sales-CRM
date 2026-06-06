import { z } from "zod";

const countSchema = z.coerce.number().int().nonnegative();

export const morningOverviewTotalsSchema = z.object({
  doors: countSchema,
  calls: countSchema,
  leads_added: countSchema,
  appointments_set: countSchema,
});

export type MorningOverviewTotals = z.infer<typeof morningOverviewTotalsSchema>;

export const morningOverviewResponseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string(),
  totals: morningOverviewTotalsSchema,
});

export type MorningOverviewResponse = z.infer<
  typeof morningOverviewResponseSchema
>;

export const lowActivityRepSchema = z.object({
  rep_id: z.string().uuid(),
  rep_name: z.string(),
  shift_id: z.string().uuid(),
  shift_started_at: z.string(),
  last_activity_at: z.string().nullable(),
  idle_minutes: countSchema,
});

export type LowActivityRep = z.infer<typeof lowActivityRepSchema>;

export const lowActivityResponseSchema = z.object({
  window_minutes: z.number().int().positive(),
  flagged: z.array(lowActivityRepSchema),
});

export type LowActivityResponse = z.infer<typeof lowActivityResponseSchema>;

export const LOW_ACTIVITY_WINDOW_MIN = 15;
export const LOW_ACTIVITY_WINDOW_MAX = 480;
export const DEFAULT_LOW_ACTIVITY_WINDOW_MINUTES = 60;

export const lowActivityQuerySchema = z.object({
  window_minutes: z.coerce
    .number()
    .int()
    .min(LOW_ACTIVITY_WINDOW_MIN)
    .max(LOW_ACTIVITY_WINDOW_MAX)
    .optional(),
});

export type LowActivityQuery = z.infer<typeof lowActivityQuerySchema>;

export function parseLowActivitySearchParams(searchParams: URLSearchParams) {
  const windowMinutes = searchParams.get("window_minutes");
  return lowActivityQuerySchema.safeParse({
    window_minutes: windowMinutes && windowMinutes.length > 0 ? windowMinutes : undefined,
  });
}

export function resolveLowActivityWindowMinutes(
  queryWindow?: number,
): number {
  if (queryWindow !== undefined) {
    return queryWindow;
  }
  const envValue = process.env.ADMIN_LOW_ACTIVITY_WINDOW_MINUTES;
  if (envValue === undefined || envValue.trim() === "") {
    return DEFAULT_LOW_ACTIVITY_WINDOW_MINUTES;
  }
  const parsed = Number(envValue);
  if (
    !Number.isInteger(parsed) ||
    parsed < LOW_ACTIVITY_WINDOW_MIN ||
    parsed > LOW_ACTIVITY_WINDOW_MAX
  ) {
    return DEFAULT_LOW_ACTIVITY_WINDOW_MINUTES;
  }
  return parsed;
}
