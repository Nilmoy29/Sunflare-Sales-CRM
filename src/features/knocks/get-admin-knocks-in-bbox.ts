import { createClient } from "@/lib/supabase/server";
import {
  endOfDaySydney,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import {
  KNOCKS_PAGE_LIMIT,
  type AdminKnockPin,
  type AdminKnocksQuery,
} from "@/lib/validators/knocks";

export async function getAdminKnocksInBbox(
  query: AdminKnocksQuery,
): Promise<{ knocks: AdminKnockPin[]; truncated: boolean }> {
  const supabase = await createClient();
  const { bbox, from, to, rep, outcome } = query;

  const { data, error } = await supabase.rpc("get_admin_knocks_in_bbox", {
    p_west: bbox.west,
    p_south: bbox.south,
    p_east: bbox.east,
    p_north: bbox.north,
    p_from: startOfDaySydney(from),
    p_to: endOfDaySydney(to),
    p_rep_ids: rep.length > 0 ? rep : null,
    p_outcomes: outcome.length > 0 ? outcome : null,
  } as never);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as AdminKnockPin[];
  const truncated = rows.length > KNOCKS_PAGE_LIMIT;

  return {
    knocks: truncated ? rows.slice(0, KNOCKS_PAGE_LIMIT) : rows,
    truncated,
  };
}
