import { createClient } from "@/lib/supabase/server";
import {
  endOfDaySydney,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import {
  shiftBreadcrumbPointSchema,
  shiftBreadcrumbShiftSchema,
  shiftBreadcrumbsResponseSchema,
  type ShiftBreadcrumbsResponse,
} from "@/lib/validators/shift-breadcrumbs";

type ShiftRow = {
  id: string;
  rep_id: string;
  started_at: string;
  ended_at: string | null;
};

function toIsoString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
}

function parseShiftRow(row: Record<string, unknown>): ShiftRow | null {
  const id = typeof row.id === "string" ? row.id : null;
  const rep_id = typeof row.rep_id === "string" ? row.rep_id : null;
  const started_at = toIsoString(row.started_at);

  if (!id || !rep_id || !started_at) {
    return null;
  }

  const ended_at =
    row.ended_at === null || row.ended_at === undefined
      ? null
      : toIsoString(row.ended_at);

  return { id, rep_id, started_at, ended_at };
}

export async function getShiftBreadcrumbs(
  repId: string,
  date: string,
): Promise<ShiftBreadcrumbsResponse> {
  const supabase = await createClient();
  const dayStart = startOfDaySydney(date);
  const dayEnd = endOfDaySydney(date);

  const { data: activeData, error: activeError } = await supabase
    .from("shifts")
    .select("id, rep_id, started_at, ended_at")
    .eq("rep_id", repId)
    .is("ended_at", null)
    .lte("started_at", dayEnd)
    .maybeSingle();

  if (activeError) {
    throw activeError;
  }

  let shiftRow = activeData
    ? parseShiftRow(activeData as Record<string, unknown>)
    : null;

  if (!shiftRow) {
    const { data: completedData, error: completedError } = await supabase
      .from("shifts")
      .select("id, rep_id, started_at, ended_at")
      .eq("rep_id", repId)
      .gte("started_at", dayStart)
      .lte("started_at", dayEnd)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (completedError) {
      throw completedError;
    }

    shiftRow = completedData
      ? parseShiftRow(completedData as Record<string, unknown>)
      : null;
  }

  if (!shiftRow) {
    return shiftBreadcrumbsResponseSchema.parse({ shift: null, points: [] });
  }

  const shift = shiftBreadcrumbShiftSchema.parse(shiftRow);

  let pingQuery = supabase
    .from("gps_pings")
    .select("lat, lng, recorded_at")
    .eq("shift_id", shift.id)
    .gte("recorded_at", shift.started_at)
    .order("recorded_at", { ascending: true });

  if (shift.ended_at) {
    pingQuery = pingQuery.lte("recorded_at", shift.ended_at);
  }

  const { data: pingData, error: pingError } = await pingQuery;

  if (pingError) {
    throw pingError;
  }

  const points = shiftBreadcrumbPointSchema.array().parse(
    (pingData ?? []).map((row) => {
      const ping = row as Record<string, unknown>;
      const recorded_at = toIsoString(ping.recorded_at) ?? "";
      return {
        lat: ping.lat,
        lng: ping.lng,
        recorded_at,
      };
    }),
  );

  return shiftBreadcrumbsResponseSchema.parse({ shift, points });
}
