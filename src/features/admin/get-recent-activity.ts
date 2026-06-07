import { createClient } from "@/lib/supabase/server";
import {
  endOfDaySydney,
  formatSydneyDateString,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import {
  mapKnockRowToActivityItem,
  type KnockActivityRow,
} from "@/features/admin/map-knock-to-activity-item";
import type { ActivityFeedItem } from "@/lib/validators/activity-feed";

const KNOCK_ACTIVITY_SELECT = `
  id,
  rep_id,
  outcome,
  knocked_at,
  lat,
  lng,
  profiles!door_knocks_rep_id_fkey ( name ),
  contacts!door_knocks_contact_id_fkey ( address, suburb, postcode )
`;

function parseKnockActivityRow(row: Record<string, unknown>): KnockActivityRow | null {
  const profiles = row.profiles as { name?: string } | null;
  const contacts = row.contacts as {
    address?: string | null;
    suburb?: string | null;
    postcode?: string | null;
  } | null;

  if (
    typeof row.id !== "string" ||
    typeof row.rep_id !== "string" ||
    typeof row.outcome !== "string" ||
    typeof row.lat !== "number" ||
    typeof row.lng !== "number" ||
    !profiles?.name
  ) {
    return null;
  }

  const knockedAt = row.knocked_at;
  const knocked_at =
    typeof knockedAt === "string"
      ? knockedAt
      : knockedAt instanceof Date
        ? knockedAt.toISOString()
        : null;

  if (!knocked_at) {
    return null;
  }

  return {
    id: row.id,
    rep_id: row.rep_id,
    rep_name: profiles.name,
    outcome: row.outcome as KnockActivityRow["outcome"],
    knocked_at,
    lat: row.lat,
    lng: row.lng,
    address: contacts?.address ?? null,
    suburb: contacts?.suburb ?? null,
    postcode: contacts?.postcode ?? null,
  };
}

export async function getRecentActivity(
  limit: number,
  from?: string,
  to?: string,
): Promise<ActivityFeedItem[]> {
  const supabase = await createClient();
  const today = formatSydneyDateString(new Date());
  const rangeFrom = from ?? today;
  const rangeTo = to ?? today;
  const rangeStart = startOfDaySydney(rangeFrom);
  const rangeEnd = endOfDaySydney(rangeTo);

  const { data, error } = await supabase
    .from("door_knocks")
    .select(KNOCK_ACTIVITY_SELECT)
    .gte("knocked_at", rangeStart)
    .lte("knocked_at", rangeEnd)
    .order("knocked_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => parseKnockActivityRow(row as Record<string, unknown>))
    .filter((row): row is KnockActivityRow => row !== null)
    .map(mapKnockRowToActivityItem);
}

export async function getActivityItemById(
  id: string,
): Promise<ActivityFeedItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("door_knocks")
    .select(KNOCK_ACTIVITY_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = parseKnockActivityRow(data as Record<string, unknown>);
  return row ? mapKnockRowToActivityItem(row) : null;
}
