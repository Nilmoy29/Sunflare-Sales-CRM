import { createClient } from "@/lib/supabase/server";
import {
  knockHistoryItemSchema,
  type KnockHistoryItem,
  type UpdateKnockBody,
} from "@/lib/validators/knocks";

export class KnockNotFoundError extends Error {
  constructor() {
    super("Knock not found");
    this.name = "KnockNotFoundError";
  }
}

export class KnockUpdateConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnockUpdateConflictError";
  }
}

type KnockRow = {
  id: string;
  outcome: KnockHistoryItem["outcome"];
  knocked_at: string;
  lat: number;
  lng: number;
  notes: string | null;
  follow_up_at: string | null;
  contacts: {
    address: string | null;
    suburb: string | null;
    postcode: string | null;
  } | null;
  leads: { id: string }[] | null;
};

function parseKnockRow(row: KnockRow): KnockHistoryItem {
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
    follow_up_at:
      row.follow_up_at === null
        ? null
        : typeof row.follow_up_at === "string"
          ? row.follow_up_at
          : new Date(row.follow_up_at).toISOString(),
    has_linked_lead: (row.leads?.length ?? 0) > 0,
    address: contact?.address ?? null,
    suburb: contact?.suburb ?? null,
    postcode: contact?.postcode ?? null,
  });
}

export async function updateKnockForRep(
  knockId: string,
  body: UpdateKnockBody,
): Promise<KnockHistoryItem> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_door_knock", {
    p_id: knockId,
    p_outcome: body.outcome,
    p_notes: body.notes,
    p_follow_up_at: body.follow_up_at,
  } as never);

  if (error) {
    if (error.code === "P0002") {
      throw new KnockNotFoundError();
    }
    if (error.code === "23514") {
      throw new KnockUpdateConflictError(
        error.message ?? "Cannot update this knock",
      );
    }
    throw error;
  }

  const { data, error: fetchError } = await supabase
    .from("door_knocks")
    .select(
      "id, outcome, knocked_at, lat, lng, notes, follow_up_at, contacts ( address, suburb, postcode ), leads ( id )",
    )
    .eq("id", knockId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!data) {
    throw new KnockNotFoundError();
  }

  return parseKnockRow(data as KnockRow);
}
