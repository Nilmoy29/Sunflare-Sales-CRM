import { z } from "zod";
import { gpsPingBodySchema } from "@sunflare/shared";
import { sydneyDateStringSchema } from "@/lib/validators/dashboard-date-range";
import { doorOutcomeSchema } from "@/lib/validators/enums";

export { gpsPingBodySchema };
export type { GpsPingBody } from "@sunflare/shared";

/** ~2 minutes — NFR7 */
export const GPS_PING_INTERVAL_MS = 120_000;

const countSchema = z.coerce.number().int().nonnegative();

export const shiftSummarySchema = z.object({
  id: z.string().uuid(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
});

export type ShiftSummary = z.infer<typeof shiftSummarySchema>;

export const doorOutcomeCountSchema = z.object({
  outcome: doorOutcomeSchema,
  count: countSchema,
});

export type DoorOutcomeCount = z.infer<typeof doorOutcomeCountSchema>;

export const repShiftSummarySchema = z.object({
  date: sydneyDateStringSchema,
  doors: countSchema,
  door_outcomes: z.array(doorOutcomeCountSchema),
  calls: countSchema,
  leads_added: countSchema,
  appointments_set: countSchema,
});

export type RepShiftSummary = z.infer<typeof repShiftSummarySchema>;

/** @deprecated Use RepShiftSummary */
export type RepDailySummary = RepShiftSummary;

export const shiftEndResponseSchema = z.object({
  id: z.string().uuid(),
  started_at: z.string(),
  ended_at: z.string(),
  shift_summary: repShiftSummarySchema,
});

export type ShiftEndResponse = z.infer<typeof shiftEndResponseSchema>;

export const shiftStartResponseSchema = z.object({
  id: z.string().uuid(),
  started_at: z.string(),
});

export const gpsPingResponseSchema = z.object({
  id: z.string().uuid(),
  recorded_at: z.string(),
});

export type GpsPingResponse = z.infer<typeof gpsPingResponseSchema>;
