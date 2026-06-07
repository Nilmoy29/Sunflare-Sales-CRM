import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import { getRepDailySummaryForDate } from "@/features/shifts/get-rep-daily-summary";
import { getActiveShiftForRep } from "@/features/shifts/queries";
import { createClient } from "@/lib/supabase/server";
import { shiftEndResponseSchema } from "@/lib/validators/shifts";

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

  const closedShift = data as {
    id: string;
    started_at: string;
    ended_at: string;
  };

  const date = formatSydneyDateString(new Date(endedAt));
  const counts = await getRepDailySummaryForDate(auth.id, date);

  const payload = {
    id: closedShift.id,
    started_at: closedShift.started_at,
    ended_at: closedShift.ended_at,
    daily_summary: {
      date,
      ...counts,
    },
  };

  const parsed = shiftEndResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return apiSuccess({
      ...payload,
      daily_summary: {
        date,
        doors: 0,
        calls: 0,
        leads_added: 0,
        appointments_set: 0,
      },
    });
  }

  return apiSuccess(parsed.data);
}
