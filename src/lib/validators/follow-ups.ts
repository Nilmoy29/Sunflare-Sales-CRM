import { z } from "zod";
import { leadDetailFollowUpTimelineItemSchema } from "@/lib/validators/lead-detail";
import { NOTES_MAX_LENGTH } from "@/lib/validators/knocks";

export function parseFollowUpDatetimeLocal(
  value: string,
): { ok: true; iso: string } | { ok: false; message: string } {
  if (!value.trim()) {
    return { ok: false, message: "Due date and time are required" };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, message: "Enter a valid date and time" };
  }

  return { ok: true, iso: date.toISOString() };
}

export function toFollowUpDatetimeLocalValue(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseOptionalFollowUpDatetimeLocal(
  value: string,
): { ok: true; iso: string | null } | { ok: false; message: string } {
  if (!value.trim()) {
    return { ok: true, iso: null };
  }
  const parsed = parseFollowUpDatetimeLocal(value);
  if (!parsed.ok) {
    return parsed;
  }
  return { ok: true, iso: parsed.iso };
}

export const followUpRowSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid(),
  rep_id: z.string().uuid(),
  due_at: z.string(),
  note: z.string(),
  completed: z.boolean(),
  created_at: z.string(),
});

export type FollowUpRow = z.infer<typeof followUpRowSchema>;

export const createFollowUpBodySchema = z.object({
  due_at: z
    .string()
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Invalid due date",
    ),
  note: z
    .string()
    .trim()
    .max(NOTES_MAX_LENGTH, `Note must be at most ${NOTES_MAX_LENGTH} characters`)
    .optional()
    .default(""),
});

export type CreateFollowUpBody = z.infer<typeof createFollowUpBodySchema>;

export const createFollowUpResponseSchema = z.object({
  follow_up: leadDetailFollowUpTimelineItemSchema,
});

export type CreateFollowUpResponse = z.infer<
  typeof createFollowUpResponseSchema
>;

export const updateFollowUpBodySchema = z
  .object({
    due_at: z
      .string()
      .refine(
        (value) => !Number.isNaN(new Date(value).getTime()),
        "Invalid due date",
      )
      .optional(),
    note: z
      .string()
      .trim()
      .max(NOTES_MAX_LENGTH, `Note must be at most ${NOTES_MAX_LENGTH} characters`)
      .optional(),
    completed: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.due_at !== undefined ||
      data.note !== undefined ||
      data.completed !== undefined,
    "At least one field is required",
  );

export type UpdateFollowUpBody = z.infer<typeof updateFollowUpBodySchema>;

export const updateFollowUpResponseSchema = z.object({
  follow_up: leadDetailFollowUpTimelineItemSchema,
});

export type UpdateFollowUpResponse = z.infer<
  typeof updateFollowUpResponseSchema
>;
