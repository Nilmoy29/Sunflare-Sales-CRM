import { createClient } from "@/lib/supabase/server";
import { leadDetailNoteTimelineItemSchema } from "@/lib/validators/lead-detail";
import type { LeadDetailTimelineItem } from "@/lib/validators/lead-detail";

const NOTE_INSERT_SELECT = `
  id,
  content,
  created_at,
  profiles!lead_activity_actor_id_fkey ( name )
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

function parseNoteRow(
  row: Record<string, unknown>,
): Extract<LeadDetailTimelineItem, { kind: "note" }> | null {
  const profiles = row.profiles as { name?: string } | null;
  const created_at = toIsoString(row.created_at);
  const content = typeof row.content === "string" ? row.content : "";

  if (typeof row.id !== "string" || !profiles?.name || !created_at) {
    return null;
  }

  return leadDetailNoteTimelineItemSchema.parse({
    kind: "note",
    id: row.id,
    occurred_at: created_at,
    rep_name: profiles.name,
    content: content || "(empty note)",
  });
}

export async function createLeadNote(
  leadId: string,
  actorId: string,
  content: string,
): Promise<Extract<LeadDetailTimelineItem, { kind: "note" }> | null> {
  const supabase = await createClient();

  const { data: leadRow } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .maybeSingle();

  if (!leadRow) {
    return null;
  }

  const { data, error } = await supabase
    .from("lead_activity")
    .insert({
      lead_id: leadId,
      actor_id: actorId,
      type: "note",
      content,
    } as never)
    .select(NOTE_INSERT_SELECT)
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

  const parsed = parseNoteRow(data as Record<string, unknown>);
  if (!parsed) {
    throw new Error("Failed to parse created note");
  }

  return parsed;
}
