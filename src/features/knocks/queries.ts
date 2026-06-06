import { createClient } from "@/lib/supabase/server";
import {
  KNOCKS_PAGE_LIMIT,
  type KnockPin,
  type MapBbox,
} from "@/lib/validators/knocks";

export async function getKnocksInBbox(
  repId: string,
  bbox: MapBbox,
): Promise<{ knocks: KnockPin[]; truncated: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_knocks_in_bbox", {
    p_west: bbox.west,
    p_south: bbox.south,
    p_east: bbox.east,
    p_north: bbox.north,
    p_rep_id: repId,
  } as never);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as KnockPin[];
  const truncated = rows.length > KNOCKS_PAGE_LIMIT;

  return {
    knocks: truncated ? rows.slice(0, KNOCKS_PAGE_LIMIT) : rows,
    truncated,
  };
}
