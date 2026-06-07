import type { DailyRepSummaryRow } from "@/lib/validators/daily-rep-summary";
import type {
  LeaderboardMetric,
  LeaderboardRow,
} from "@/lib/validators/team-leaderboard";

function metricValue(row: DailyRepSummaryRow, metric: LeaderboardMetric): number {
  return row[metric];
}

export function rankRepMetrics(
  rows: DailyRepSummaryRow[],
  metric: LeaderboardMetric,
): LeaderboardRow[] {
  const sorted = [...rows].sort((a, b) => {
    const byValue = metricValue(b, metric) - metricValue(a, metric);
    if (byValue !== 0) {
      return byValue;
    }
    return a.rep_name.localeCompare(b.rep_name);
  });

  const ranked: LeaderboardRow[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const row = sorted[index]!;
    const value = metricValue(row, metric);
    const rank =
      index === 0
        ? 1
        : value === metricValue(sorted[index - 1]!, metric)
          ? ranked[index - 1]!.rank
          : index + 1;

    ranked.push({
      rank,
      rep_id: row.rep_id,
      rep_name: row.rep_name,
      value,
    });
  }

  return ranked;
}
