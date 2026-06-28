import { createClient } from "@/lib/supabase/server";
import {
  leadDetailFollowUpTimelineItemSchema,
  type LeadDetailTimelineItem,
} from "@/lib/validators/lead-detail";
import type { UpdateFollowUpBody } from "@/lib/validators/follow-ups";

const FOLLOW_UP_SELECT = `
  id,
  due_at,
  note,
  completed,
  profiles!follow_ups_rep_id_fkey ( name )
`;

function toIsoString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
}

function parseFollowUpRow(
  row: Record<string, unknown>,
): Extract<LeadDetailTimelineItem, { kind: "follow_up" }> | null {
  const profiles = row.profiles as { name?: string } | null;
  const due_at = toIsoString(row.due_at);

  if (
    typeof row.id !== "string" ||
    !profiles?.name ||
    !due_at ||
    typeof row.completed !== "boolean"
  ) {
    return null;
  }

  return leadDetailFollowUpTimelineItemSchema.parse({
    kind: "follow_up",
    id: row.id,
    occurred_at: due_at,
    rep_name: profiles.name,
    due_at,
    note: typeof row.note === "string" ? row.note : "",
    completed: row.completed,
  });
}

export async function updateLeadFollowUp(
  leadId: string,
  followUpId: string,
  body: UpdateFollowUpBody,
): Promise<Extract<LeadDetailTimelineItem, { kind: "follow_up" }> | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("follow_ups")
    .select("id, lead_id")
    .eq("id", followUpId)
    .eq("lead_id", leadId)
    .maybeSingle();

  if (!existing) {
    return null;
  }

  const patch: Record<string, unknown> = {};
  if (body.due_at !== undefined) {
    patch.due_at = body.due_at;
  }
  if (body.note !== undefined) {
    patch.note = body.note;
  }
  if (body.completed !== undefined) {
    patch.completed = body.completed;
  }

  const { data, error } = await supabase
    .from("follow_ups")
    .update(patch as never)
    .eq("id", followUpId)
    .eq("lead_id", leadId)
    .select(FOLLOW_UP_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "42501" || error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  const parsed = parseFollowUpRow(data as Record<string, unknown>);
  if (!parsed) {
    throw new Error("Failed to parse updated follow-up");
  }

  return parsed;
}
