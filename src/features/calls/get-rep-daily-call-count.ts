import {
  endOfDaySydney,
  formatSydneyDateString,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import { createClient } from "@/lib/supabase/server";
import { repDailyCallCountResponseSchema } from "@/lib/validators/call-logs";

export async function getRepDailyCallCount(
  date?: string,
): Promise<{ date: string; count: number }> {
  const resolvedDate = date ?? formatSydneyDateString(new Date());
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("call_logs")
    .select("*", { count: "exact", head: true })
    .gte("called_at", startOfDaySydney(resolvedDate))
    .lte("called_at", endOfDaySydney(resolvedDate));

  if (error) {
    throw error;
  }

  return repDailyCallCountResponseSchema.parse({
    date: resolvedDate,
    count: count ?? 0,
  });
}
