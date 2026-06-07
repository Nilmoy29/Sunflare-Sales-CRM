import { createClient } from "@/lib/supabase/server";
import {
  parseTerritoryAssignmentSummary,
  type TerritoryAssignmentSummary,
  type TerritoryAssignmentsListQuery,
} from "@/lib/validators/territory-assignments";

export async function getTerritoryAssignmentsForAdmin(
  query: TerritoryAssignmentsListQuery = {},
): Promise<TerritoryAssignmentSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_territory_assignments_for_admin" as never,
    {
      p_assigned_date: query.assigned_date ?? null,
      p_rep_id: query.rep_id ?? null,
      p_territory_id: query.territory_id ?? null,
    } as never,
  );

  if (error) {
    throw error;
  }

  const rows = data as Record<string, unknown>[] | null;

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => parseTerritoryAssignmentSummary(row))
    .filter((row): row is TerritoryAssignmentSummary => row !== null);
}
