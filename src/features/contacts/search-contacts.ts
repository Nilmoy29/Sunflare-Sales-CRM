import { createClient } from "@/lib/supabase/server";
import {
  CONTACT_SEARCH_DEFAULT_LIMIT,
  parseContactSearchResult,
  type ContactSearchResult,
} from "@/lib/validators/contacts";

export async function searchContactsForCalls(
  query: string,
  limit = CONTACT_SEARCH_DEFAULT_LIMIT,
): Promise<ContactSearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_contacts_for_calls", {
    p_query: query,
    p_limit: limit,
  } as never);

  if (error) {
    throw error;
  }

  const rows = data as Record<string, unknown>[] | null;
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => parseContactSearchResult(row))
    .filter((row): row is ContactSearchResult => row !== null);
}
