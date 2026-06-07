import { getDailyRepSummary } from "@/features/admin/get-daily-rep-summary";
import type { RepDailySummary } from "@/lib/validators/shifts";

const EMPTY_COUNTS = {
  doors: 0,
  calls: 0,
  leads_added: 0,
  appointments_set: 0,
} as const;

export async function getRepDailySummaryForDate(
  repId: string,
  date: string,
): Promise<Omit<RepDailySummary, "date">> {
  try {
    const result = await getDailyRepSummary(date, date);
    const row = result.rows.find((entry) => entry.rep_id === repId);

    if (!row) {
      return { ...EMPTY_COUNTS };
    }

    return {
      doors: row.doors,
      calls: row.calls,
      leads_added: row.leads_added,
      appointments_set: row.appointments_set,
    };
  } catch {
    return { ...EMPTY_COUNTS };
  }
}
