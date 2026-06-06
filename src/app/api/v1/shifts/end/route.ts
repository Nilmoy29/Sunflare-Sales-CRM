import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getActiveShiftForRep } from "@/features/shifts/queries";
import { createClient } from "@/lib/supabase/server";
import type { ShiftSummary } from "@/lib/validators/shifts";

export async function POST() {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const active = await getActiveShiftForRep(auth.id);
  if (!active) {
    return apiError("NO_ACTIVE_SHIFT", "No active shift to end", 404);
  }

  const endedAt = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .update({ ended_at: endedAt } as never)
    .eq("id", active.id)
    .eq("rep_id", auth.id)
    .is("ended_at", null)
    .select("id, started_at, ended_at")
    .single();

  if (error || !data) {
    return apiError("NO_ACTIVE_SHIFT", "No active shift to end", 404);
  }

  return apiSuccess(data as ShiftSummary);
}
