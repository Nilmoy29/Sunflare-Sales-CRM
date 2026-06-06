import { createClient } from "@/lib/supabase/server";
import {
  leadSummarySchema,
  type PromoteCallResponse,
} from "@/lib/validators/leads";

export class CallNotFoundError extends Error {
  constructor() {
    super("Call log not found");
    this.name = "CallNotFoundError";
  }
}

export class CallNotPromotableError extends Error {
  constructor() {
    super("Call outcome is not promotable");
    this.name = "CallNotPromotableError";
  }
}

export async function promoteCallToLead(
  callLogId: string,
): Promise<PromoteCallResponse> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("promote_call_to_lead", {
    p_call_log_id: callLogId,
  } as never);

  if (error) {
    if (
      error.code === "P0002" ||
      error.message?.toLowerCase().includes("call log not found")
    ) {
      throw new CallNotFoundError();
    }
    if (
      error.code === "22023" ||
      error.message?.toLowerCase().includes("not promotable")
    ) {
      throw new CallNotPromotableError();
    }
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | Record<string, unknown>
    | null;

  if (!row || typeof row !== "object") {
    throw new Error("Invalid promote response from database");
  }

  const lead = leadSummarySchema.safeParse({
    id: row.lead_id,
    stage: "interested",
    source: "call",
  });

  if (!lead.success) {
    throw new Error("Invalid promote response from database");
  }

  return {
    lead: lead.data,
    created: row.lead_created === true,
  };
}
