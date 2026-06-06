import { z } from "zod";
import { callOutcomeSchema } from "@/lib/validators/enums";

export const CALL_NOTES_MAX_LENGTH = 2000;
export const CALL_DURATION_MINUTES_MAX = 480;

export const callLogRowSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid(),
  rep_id: z.string().uuid(),
  outcome: callOutcomeSchema,
  duration_seconds: z.number().int().nullable(),
  notes: z.string().nullable(),
  called_at: z.string(),
  follow_up_at: z.string().nullable(),
});

export type CallLogRow = z.infer<typeof callLogRowSchema>;

export const callLogSummarySchema = callLogRowSchema;

export type CallLogSummary = z.infer<typeof callLogSummarySchema>;

export const createCallBodySchema = z.object({
  contact_id: z.string().uuid(),
  outcome: callOutcomeSchema,
  duration_minutes: z
    .number()
    .int("Duration must be a whole number of minutes")
    .min(0, "Duration cannot be negative")
    .max(CALL_DURATION_MINUTES_MAX)
    .optional()
    .nullable(),
  notes: z
    .string()
    .trim()
    .max(CALL_NOTES_MAX_LENGTH)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  follow_up_at: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export type CreateCallBody = z.infer<typeof createCallBodySchema>;

export const createCallResponseSchema = z.object({
  call: callLogSummarySchema,
});

export type CreateCallResponse = z.infer<typeof createCallResponseSchema>;

export function parseCallLogSummary(
  row: Record<string, unknown>,
): CallLogSummary | null {
  const calledAt = row.called_at;
  const followUpAt = row.follow_up_at;

  const parsed = callLogSummarySchema.safeParse({
    id: row.id,
    contact_id: row.contact_id,
    rep_id: row.rep_id,
    outcome: row.outcome,
    duration_seconds:
      row.duration_seconds === null || row.duration_seconds === undefined
        ? null
        : Number(row.duration_seconds),
    notes: row.notes ?? null,
    called_at:
      typeof calledAt === "string"
        ? calledAt
        : calledAt instanceof Date
          ? calledAt.toISOString()
          : calledAt,
    follow_up_at:
      followUpAt === null || followUpAt === undefined
        ? null
        : typeof followUpAt === "string"
          ? followUpAt
          : followUpAt instanceof Date
            ? followUpAt.toISOString()
            : followUpAt,
  });

  return parsed.success ? parsed.data : null;
}
