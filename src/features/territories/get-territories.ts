import { createClient } from "@/lib/supabase/server";
import {
  parseTerritorySummary,
  type TerritorySummary,
} from "@/lib/validators/territories";

export async function getTerritoriesForAdmin(): Promise<TerritorySummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_territories_for_admin" as never);

  if (error) {
    throw error;
  }

  const rows = data as Record<string, unknown>[] | null;

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => parseTerritorySummary(row))
    .filter((row): row is TerritorySummary => row !== null);
}
