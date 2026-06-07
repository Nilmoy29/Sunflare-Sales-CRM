import { createClient } from "@/lib/supabase/server";
import {
  endOfDaySydney,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import {
  dailyRepSummaryResponseSchema,
  dailyRepSummaryRowSchema,
  type DailyRepSummaryResponse,
} from "@/lib/validators/daily-rep-summary";

export async function getDailyRepSummary(
  from: string,
  to: string,
): Promise<DailyRepSummaryResponse> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_admin_daily_rep_summary", {
    p_from: startOfDaySydney(from),
    p_to: endOfDaySydney(to),
  } as never);

  if (error) {
    throw error;
  }

  const rows = dailyRepSummaryRowSchema.array().parse(data ?? []);

  return dailyRepSummaryResponseSchema.parse({ from, to, rows });
}
