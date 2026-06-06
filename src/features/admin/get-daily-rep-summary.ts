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
  date: string,
): Promise<DailyRepSummaryResponse> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_admin_daily_rep_summary", {
    p_from: startOfDaySydney(date),
    p_to: endOfDaySydney(date),
  } as never);

  if (error) {
    throw error;
  }

  const rows = dailyRepSummaryRowSchema.array().parse(data ?? []);

  return dailyRepSummaryResponseSchema.parse({ date, rows });
}
