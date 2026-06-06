import { createClient } from "@/lib/supabase/server";
import { leadSummarySchema, type LeadSummary } from "@/lib/validators/leads";
import {
  knockPinSchema,
  type CreateKnockBody,
  type KnockPin,
} from "@/lib/validators/knocks";

export type CreateKnockResult = {
  knock: KnockPin;
  duplicate: boolean;
  lead?: LeadSummary;
};

function parseLeadRow(leadId: unknown): LeadSummary | undefined {
  if (typeof leadId !== "string" || !leadId) {
    return undefined;
  }

  const parsed = leadSummarySchema.safeParse({
    id: leadId,
    stage: "interested",
    source: "d2d",
  });

  return parsed.success ? parsed.data : undefined;
}

function parseKnockRow(row: Record<string, unknown>): CreateKnockResult {
  const knockedAt = row.knocked_at;
  const parsed = knockPinSchema.safeParse({
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    outcome: row.outcome,
    knocked_at:
      typeof knockedAt === "string"
        ? knockedAt
        : knockedAt instanceof Date
          ? knockedAt.toISOString()
          : knockedAt,
  });

  if (!parsed.success) {
    throw new Error("Invalid knock response from database");
  }

  const lead = parseLeadRow(row.lead_id);

  return {
    knock: parsed.data,
    duplicate: row.was_duplicate === true,
    ...(lead ? { lead } : {}),
  };
}

export async function createKnockWithContact(
  body: CreateKnockBody,
  idempotencyKey: string | null = null,
): Promise<CreateKnockResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_knock_with_contact", {
    p_lat: body.lat,
    p_lng: body.lng,
    p_outcome: body.outcome,
    p_notes: body.notes,
    p_follow_up_at: body.follow_up_at,
    p_address: body.address,
    p_suburb: body.suburb,
    p_postcode: body.postcode,
    p_idempotency_key: idempotencyKey,
  } as never);

  if (error) {
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<
    string,
    unknown
  > | null;
  if (!row || typeof row !== "object") {
    throw new Error("Invalid knock response from database");
  }

  return parseKnockRow(row);
}
