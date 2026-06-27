import { z } from "zod";
import { callOutcomeSchema } from "@/lib/validators/enums";
import {
  endOfDaySydney,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";

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

export const CALL_HISTORY_DEFAULT_LIMIT = 50;
export const CALL_HISTORY_MAX_LIMIT = 100;

export const callHistoryQuerySchema = z
  .object({
    from: sydneyDateStringSchema,
    to: sydneyDateStringSchema,
    outcome: z.array(callOutcomeSchema).default([]),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(CALL_HISTORY_MAX_LIMIT)
      .default(CALL_HISTORY_DEFAULT_LIMIT),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine((data) => data.from <= data.to, {
    message: "from must be on or before to",
  });

export type CallHistoryQuery = z.infer<typeof callHistoryQuerySchema>;

export function parseCallHistorySearchParams(searchParams: URLSearchParams) {
  const outcomes = searchParams.getAll("outcome");
  return callHistoryQuerySchema.safeParse({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    outcome: outcomes.length > 0 ? outcomes : [],
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });
}

export const callHistoryItemSchema = callLogSummarySchema.extend({
  has_linked_lead: z.boolean(),
  contact_name: z.string().nullable(),
  contact_phone: z.string().nullable(),
  address: z.string().nullable(),
  suburb: z.string().nullable(),
});

export type CallHistoryItem = z.infer<typeof callHistoryItemSchema>;

export const callHistoryResponseSchema = z.object({
  calls: z.array(callHistoryItemSchema),
  total: z.number().nullable(),
  truncated: z.boolean(),
});

export type CallHistoryResponse = z.infer<typeof callHistoryResponseSchema>;

export function parseCallHistoryRow(
  row: Record<string, unknown>,
): CallHistoryItem | null {
  const summary = parseCallLogSummary(row);
  if (!summary) {
    return null;
  }

  const contacts = row.contacts as
    | {
        first_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
        address?: string | null;
        suburb?: string | null;
      }
    | null;
  const leads = row.leads as { id?: string }[] | { id?: string } | null;
  const hasLinkedLead = Array.isArray(leads)
    ? leads.length > 0
    : Boolean(leads?.id);

  const nameParts = [contacts?.first_name, contacts?.last_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  const parsed = callHistoryItemSchema.safeParse({
    ...summary,
    has_linked_lead: hasLinkedLead,
    contact_name: nameParts.length > 0 ? nameParts.join(" ") : null,
    contact_phone: contacts?.phone ?? null,
    address: contacts?.address ?? null,
    suburb: contacts?.suburb ?? null,
  });

  return parsed.success ? parsed.data : null;
}

export { endOfDaySydney, startOfDaySydney };

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
