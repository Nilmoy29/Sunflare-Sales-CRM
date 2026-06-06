import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getActiveShiftForRep } from "@/features/shifts/queries";
import { gpsPingBodySchema } from "@/lib/validators/shifts";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = gpsPingBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid GPS ping payload",
      400,
      parsed.error.flatten(),
    );
  }

  const active = await getActiveShiftForRep(auth.id);
  if (!active || active.id !== parsed.data.shift_id) {
    return apiError("SHIFT_NOT_ACTIVE", "Shift is not active", 404);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gps_pings")
    .insert({
      rep_id: auth.id,
      shift_id: parsed.data.shift_id,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    } as never)
    .select("id, recorded_at")
    .single();

  if (error || !data) {
    return apiError("GPS_PING_FAILED", "Could not record GPS ping", 500);
  }

  return apiSuccess(data as { id: string; recorded_at: string });
}
