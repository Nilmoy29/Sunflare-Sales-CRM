import { createClient } from "@/lib/supabase/server";
import {
  lowActivityRepSchema,
  lowActivityResponseSchema,
  resolveLowActivityWindowMinutes,
  type LowActivityResponse,
} from "@/lib/validators/dashboard-coaching";

export async function getLowActivityReps(
  queryWindowMinutes?: number,
): Promise<LowActivityResponse> {
  const windowMinutes = resolveLowActivityWindowMinutes(queryWindowMinutes);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_admin_low_activity_reps", {
    p_window_minutes: windowMinutes,
  } as never);

  if (error) {
    throw error;
  }

  const flagged = lowActivityRepSchema.array().parse(data ?? []);

  return lowActivityResponseSchema.parse({
    window_minutes: windowMinutes,
    flagged,
  });
}
