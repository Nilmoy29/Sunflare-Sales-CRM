import { getDailyRepSummary } from "@/features/admin/get-daily-rep-summary";
import {
  formatSydneyMorningLabel,
  yesterdaySydneyDateString,
} from "@/features/knocks/format-knock-date";
import {
  morningOverviewResponseSchema,
  morningOverviewTotalsSchema,
  type MorningOverviewResponse,
} from "@/lib/validators/dashboard-coaching";

export async function getMorningOverview(): Promise<MorningOverviewResponse> {
  const date = yesterdaySydneyDateString();
  const { rows } = await getDailyRepSummary(date);

  const totals = morningOverviewTotalsSchema.parse(
    rows.reduce(
      (acc, row) => ({
        doors: acc.doors + row.doors,
        calls: acc.calls + row.calls,
        leads_added: acc.leads_added + row.leads_added,
        appointments_set: acc.appointments_set + row.appointments_set,
      }),
      { doors: 0, calls: 0, leads_added: 0, appointments_set: 0 },
    ),
  );

  return morningOverviewResponseSchema.parse({
    date,
    label: `Yesterday — ${formatSydneyMorningLabel(date)}`,
    totals,
  });
}
