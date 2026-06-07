import { createClient } from "@/lib/supabase/server";
import {
  endOfDaySydney,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import {
  repActivityTrendDaySchema,
  repActivityTrendResponseSchema,
  type RepActivityTrendResponse,
} from "@/lib/validators/rep-deep-dive";

function formatActivityDate(value: unknown): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  throw new Error("Invalid activity_date from RPC");
}

export async function getRepActivityTrend(
  repId: string,
  from: string,
  to: string,
): Promise<RepActivityTrendResponse> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_admin_rep_activity_trend", {
    p_rep_id: repId,
    p_from: startOfDaySydney(from),
    p_to: endOfDaySydney(to),
  } as never);

  if (error) {
    throw error;
  }

  const days = repActivityTrendDaySchema.array().parse(
    ((data ?? []) as Record<string, unknown>[]).map((record) => ({
      activity_date: formatActivityDate(record.activity_date),
      doors: record.doors,
      calls: record.calls,
      leads_added: record.leads_added,
      appointments_set: record.appointments_set,
    })),
  );

  return repActivityTrendResponseSchema.parse({ rep_id: repId, from, to, days });
}
