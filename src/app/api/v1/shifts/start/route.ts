import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getActiveShiftForRep } from "@/features/shifts/queries";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const existing = await getActiveShiftForRep(auth.id);
  if (existing) {
    return apiError(
      "SHIFT_ALREADY_ACTIVE",
      "You already have an active shift",
      409,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .insert({ rep_id: auth.id } as never)
    .select("id, started_at")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return apiError(
        "SHIFT_ALREADY_ACTIVE",
        "You already have an active shift",
        409,
      );
    }
    return apiError("SHIFT_START_FAILED", "Could not start shift", 500);
  }

  const shift = data as { id: string; started_at: string };
  return apiSuccess({ id: shift.id, started_at: shift.started_at });
}
