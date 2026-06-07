import { createClient } from "@/lib/supabase/server";
import {
  contactCallHistoryResponseSchema,
  type ContactCallHistoryResponse,
} from "@/lib/validators/lead-detail";
import { parseContactCallHistoryRow } from "@/lib/validators/call-logs";

const CONTACT_CALL_HISTORY_SELECT = `
  id,
  contact_id,
  rep_id,
  outcome,
  duration_seconds,
  notes,
  called_at,
  follow_up_at,
  profiles!call_logs_rep_id_fkey ( name )
`;

export async function getContactCallHistory(
  contactId: string,
): Promise<ContactCallHistoryResponse> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("call_logs")
    .select(CONTACT_CALL_HISTORY_SELECT)
    .eq("contact_id", contactId)
    .order("called_at", { ascending: false });

  if (error) {
    throw error;
  }

  const calls = (data ?? [])
    .map((row) => parseContactCallHistoryRow(row as Record<string, unknown>))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return contactCallHistoryResponseSchema.parse({ calls });
}
