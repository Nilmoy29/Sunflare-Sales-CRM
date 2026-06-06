import { createClient } from "@/lib/supabase/server";
import {
  leadDetailFollowUpTimelineItemSchema,
  type LeadDetailTimelineItem,
} from "@/lib/validators/lead-detail";

const FOLLOW_UP_INSERT_SELECT = `
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

export async function createLeadFollowUp(
  leadId: string,
  dueAt: string,
  note: string,
): Promise<Extract<LeadDetailTimelineItem, { kind: "follow_up" }> | null> {
  const supabase = await createClient();

  const { data: leadRow } = await supabase
    .from("leads")
    .select("id, rep_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!leadRow) {
    return null;
  }

  const rep_id =
    typeof (leadRow as { rep_id?: string }).rep_id === "string"
      ? (leadRow as { rep_id: string }).rep_id
      : null;

  if (!rep_id) {
    return null;
  }

  const { data, error } = await supabase
    .from("follow_ups")
    .insert({
      lead_id: leadId,
      rep_id,
      due_at: dueAt,
      note,
      completed: false,
    } as never)
    .select(FOLLOW_UP_INSERT_SELECT)
    .single();

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
    throw new Error("Failed to parse created follow-up");
  }

  return parsed;
}
