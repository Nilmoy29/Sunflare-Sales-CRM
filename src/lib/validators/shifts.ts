import { z } from "zod";

/** ~2 minutes — NFR7 */
export const GPS_PING_INTERVAL_MS = 120_000;

export const shiftSummarySchema = z.object({
  id: z.string().uuid(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
});

export type ShiftSummary = z.infer<typeof shiftSummarySchema>;

export const shiftStartResponseSchema = z.object({
  id: z.string().uuid(),
  started_at: z.string(),
});

export const gpsPingBodySchema = z.object({
  shift_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type GpsPingBody = z.infer<typeof gpsPingBodySchema>;

export const gpsPingResponseSchema = z.object({
  id: z.string().uuid(),
  recorded_at: z.string(),
});

export type GpsPingResponse = z.infer<typeof gpsPingResponseSchema>;
