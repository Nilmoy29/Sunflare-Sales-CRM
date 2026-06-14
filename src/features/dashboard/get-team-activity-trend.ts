import { createClient } from "@/lib/supabase/server";
import {
  endOfDaySydney,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import {
  teamActivityTrendResponseSchema,
  type TeamActivityTrendResponse,
} from "@/lib/validators/team-activity-trend";
import { repActivityTrendDaySchema } from "@/lib/validators/rep-deep-dive";

function formatActivityDate(value: unknown): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  throw new Error("Invalid activity_date from RPC");
}

export async function getTeamActivityTrend(
  from: string,
  to: string,
): Promise<TeamActivityTrendResponse> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_admin_team_activity_trend", {
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

  return teamActivityTrendResponseSchema.parse({ from, to, days });
}
