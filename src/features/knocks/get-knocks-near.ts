import { createClient } from "@/lib/supabase/server";
import {
  isKnockTodaySydney,
  repDisplayFirstName,
} from "@/features/knocks/format-knock-date";
import {
  duplicateAlertSchema,
  knocksNearResponseSchema,
  priorKnockSchema,
  type DuplicateAlert,
  type KnocksNearResponse,
  type PriorKnock,
} from "@/lib/validators/knocks";

const DEFAULT_RADIUS_M = 40;
const DEFAULT_LIMIT = 15;

type RpcNearRow = {
  id: string;
  outcome: PriorKnock["outcome"];
  knocked_at: string;
  rep_id: string;
  rep_name: string;
  is_own: boolean;
};

function buildDuplicateAlert(priorKnocks: PriorKnock[]): DuplicateAlert | null {
  const otherRepToday = priorKnocks.find(
    (knock) => !knock.is_own && isKnockTodaySydney(knock.knocked_at),
  );
  if (!otherRepToday) {
    return null;
  }

  return duplicateAlertSchema.parse({
    rep_name: repDisplayFirstName(otherRepToday.rep_name, false),
    knocked_at: otherRepToday.knocked_at,
    outcome: otherRepToday.outcome,
  });
}

export async function getKnocksNearPoint(
  lat: number,
  lng: number,
  radiusM = DEFAULT_RADIUS_M,
  limit = DEFAULT_LIMIT,
): Promise<KnocksNearResponse> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_knocks_near_point", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_limit: limit,
  } as never);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RpcNearRow[];
  const priorKnocks = rows.map((row) =>
    priorKnockSchema.parse({
      id: row.id,
      outcome: row.outcome,
      knocked_at:
        typeof row.knocked_at === "string"
          ? row.knocked_at
          : new Date(row.knocked_at).toISOString(),
      rep_id: row.rep_id,
      rep_name: row.rep_name,
      is_own: row.is_own,
    }),
  );

  const duplicateAlert = buildDuplicateAlert(priorKnocks);

  return knocksNearResponseSchema.parse({
    priorKnocks,
    duplicateAlert,
  });
}
