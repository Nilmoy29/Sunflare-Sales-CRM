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

export const updateCallBodySchema = z.object({
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

export type UpdateCallBody = z.infer<typeof updateCallBodySchema>;

export const createCallResponseSchema = z.object({
  call: callLogSummarySchema,
});

export const updateCallResponseSchema = z.object({
  call: callLogSummarySchema.extend({
    has_linked_lead: z.boolean(),
  }),
});

export type UpdateCallResponse = z.infer<typeof updateCallResponseSchema>;

export type CreateCallResponse = z.infer<typeof createCallResponseSchema>;

const sydneyDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const repDailyCallCountQuerySchema = z.object({
  date: sydneyDateStringSchema.optional(),
});

export type RepDailyCallCountQuery = z.infer<
  typeof repDailyCallCountQuerySchema
>;

export const repDailyCallCountResponseSchema = z.object({
  date: sydneyDateStringSchema,
  count: z.number().int().nonnegative(),
});

export type RepDailyCallCountResponse = z.infer<
  typeof repDailyCallCountResponseSchema
>;

export function parseRepDailyCallCountSearchParams(
  searchParams: URLSearchParams,
) {
  const date = searchParams.get("date");
  return repDailyCallCountQuerySchema.safeParse({
    date: date && date.length > 0 ? date : undefined,
  });
}

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

export type CallLogTimelineItem = {
  kind: "call";
  id: string;
  occurred_at: string;
  rep_name: string;
  outcome: CallLogSummary["outcome"];
  notes: string | null;
  duration_seconds: number | null;
};

export function formatCallDurationMinutes(
  durationSeconds: number | null,
): string | null {
  if (durationSeconds === null || durationSeconds <= 0) {
    return null;
  }

  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min`;
}

export function parseCallLogTimelineRow(
  row: Record<string, unknown>,
): CallLogTimelineItem | null {
  const profiles = row.profiles as { name?: string } | null;
  const summary = parseCallLogSummary(row);

  if (!summary || !profiles?.name) {
    return null;
  }

  return {
    kind: "call",
    id: summary.id,
    occurred_at: summary.called_at,
    rep_name: profiles.name,
    outcome: summary.outcome,
    notes: summary.notes,
    duration_seconds: summary.duration_seconds,
  };
}

export function parseContactCallHistoryRow(
  row: Record<string, unknown>,
): (CallLogSummary & { rep_name: string; has_linked_lead: boolean }) | null {
  const profiles = row.profiles as { name?: string } | null;
  const summary = parseCallLogSummary(row);
  const leads = row.leads as { id?: string }[] | { id?: string } | null;
  const hasLinkedLead = Array.isArray(leads)
    ? leads.length > 0
    : Boolean(leads?.id);

  if (!summary || !profiles?.name) {
    return null;
  }

  return {
    ...summary,
    rep_name: profiles.name,
    has_linked_lead: hasLinkedLead,
  };
}
