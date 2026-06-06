import { createClient } from "@/lib/supabase/server";
import {
  parseCallLogSummary,
  type CallLogSummary,
  type CreateCallBody,
} from "@/lib/validators/call-logs";
import type { CallOutcome } from "@/lib/validators/enums";

export class ContactNotFoundError extends Error {
  constructor() {
    super("Contact not found");
    this.name = "ContactNotFoundError";
  }
}

type CreateCallLogInput = {
  contact_id: string;
  outcome: CallOutcome;
  duration_seconds: number | null;
  notes: string | null;
  follow_up_at: string | null;
};

export async function createCallLogForRep(
  body: CreateCallBody,
): Promise<CallLogSummary> {
  const durationSeconds =
    body.duration_minutes != null ? body.duration_minutes * 60 : null;

  const input: CreateCallLogInput = {
    contact_id: body.contact_id,
    outcome: body.outcome,
    duration_seconds: durationSeconds,
    notes: body.notes,
    follow_up_at: body.follow_up_at,
  };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_call_log", {
    p_contact_id: input.contact_id,
    p_outcome: input.outcome,
    p_duration_seconds: input.duration_seconds,
    p_notes: input.notes,
    p_follow_up_at: input.follow_up_at,
  } as never);

  if (error) {
    if (
      error.code === "P0002" ||
      error.message?.toLowerCase().includes("contact not found")
    ) {
      throw new ContactNotFoundError();
    }
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | Record<string, unknown>
    | null;

  if (!row || typeof row !== "object") {
    throw new Error("Invalid call log response from database");
  }

  const call = parseCallLogSummary(row);
  if (!call) {
    throw new Error("Invalid call log response from database");
  }

  return call;
}
