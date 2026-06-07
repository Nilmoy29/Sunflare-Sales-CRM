import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import { createClient } from "@/lib/supabase/server";
import {
  parseRepTerritoryOverlay,
  type RepTerritoriesForDateQuery,
  type RepTerritoryOverlay,
} from "@/lib/validators/territories";

export async function getRepTerritoriesForDate(
  query: RepTerritoriesForDateQuery = {},
): Promise<RepTerritoryOverlay[]> {
  const assignedDate =
    query.assigned_date ?? formatSydneyDateString(new Date());

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_rep_territories_for_date" as never,
    { p_assigned_date: assignedDate } as never,
  );

  if (error) {
    throw error;
  }

  const rows = data as Record<string, unknown>[] | null;

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => parseRepTerritoryOverlay(row))
    .filter((row): row is RepTerritoryOverlay => row !== null);
}
