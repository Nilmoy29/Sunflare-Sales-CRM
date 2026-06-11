import { createClient } from "@/lib/supabase/server";
import { parseContactCallHistoryRow } from "@/lib/validators/call-logs";
import type { ContactCallHistoryItem } from "@/lib/validators/lead-detail";
import type { UpdateCallBody } from "@/lib/validators/call-logs";

export class CallLogNotFoundError extends Error {
  constructor() {
    super("Call log not found");
    this.name = "CallLogNotFoundError";
  }
}

export class CallLogUpdateConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CallLogUpdateConflictError";
  }
}

export async function updateCallLogForRep(
  callLogId: string,
  body: UpdateCallBody,
): Promise<ContactCallHistoryItem> {
  const durationSeconds =
    body.duration_minutes != null ? body.duration_minutes * 60 : null;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_call_log", {
    p_id: callLogId,
    p_outcome: body.outcome,
    p_duration_seconds: durationSeconds,
    p_notes: body.notes,
    p_follow_up_at: body.follow_up_at,
  } as never);

  if (error) {
    if (error.code === "P0002") {
      throw new CallLogNotFoundError();
    }
    if (error.code === "23514") {
      throw new CallLogUpdateConflictError(
        error.message ?? "Cannot update this call",
      );
    }
    throw error;
  }

  const { data, error: fetchError } = await supabase
    .from("call_logs")
    .select(
      "id, contact_id, rep_id, outcome, duration_seconds, notes, called_at, follow_up_at, profiles!call_logs_rep_id_fkey ( name ), leads ( id )",
    )
    .eq("id", callLogId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const parsed = parseContactCallHistoryRow(
    (data ?? {}) as Record<string, unknown>,
  );

  if (!parsed) {
    throw new CallLogNotFoundError();
  }

  return parsed;
}
