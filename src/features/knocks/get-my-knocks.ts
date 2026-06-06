import { createClient } from "@/lib/supabase/server";
import {
  endOfDaySydney,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import {
  knockHistoryItemSchema,
  knockHistoryResponseSchema,
  type KnockHistoryQuery,
  type KnockHistoryResponse,
} from "@/lib/validators/knocks";

type KnockRow = {
  id: string;
  outcome: KnockHistoryResponse["knocks"][number]["outcome"];
  knocked_at: string;
  lat: number;
  lng: number;
  notes: string | null;
  contacts: {
    address: string | null;
    suburb: string | null;
    postcode: string | null;
  } | null;
};

function parseKnockRow(row: KnockRow) {
  const contact = row.contacts;
  return knockHistoryItemSchema.parse({
    id: row.id,
    outcome: row.outcome,
    knocked_at:
      typeof row.knocked_at === "string"
        ? row.knocked_at
        : new Date(row.knocked_at).toISOString(),
    lat: row.lat,
    lng: row.lng,
    notes: row.notes,
    address: contact?.address ?? null,
    suburb: contact?.suburb ?? null,
    postcode: contact?.postcode ?? null,
  });
}

export async function getMyKnocks(
  repId: string,
  query: KnockHistoryQuery,
): Promise<KnockHistoryResponse> {
  const supabase = await createClient();
  const rangeStart = startOfDaySydney(query.from);
  const rangeEnd = endOfDaySydney(query.to);
  const fetchLimit = query.limit + 1;

  let builder = supabase
    .from("door_knocks")
    .select(
      "id, outcome, knocked_at, lat, lng, notes, contacts ( address, suburb, postcode )",
    )
    .eq("rep_id", repId)
    .gte("knocked_at", rangeStart)
    .lte("knocked_at", rangeEnd)
    .order("knocked_at", { ascending: false })
    .range(query.offset, query.offset + fetchLimit - 1);

  if (query.outcome.length > 0) {
    builder = builder.in("outcome", query.outcome);
  }

  const { data, error } = await builder;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as KnockRow[];
  const truncated = rows.length > query.limit;
  const pageRows = truncated ? rows.slice(0, query.limit) : rows;

  return knockHistoryResponseSchema.parse({
    knocks: pageRows.map(parseKnockRow),
    total: null,
    truncated,
  });
}
