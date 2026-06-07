import type { DailyRepSummaryRow } from "@/lib/validators/daily-rep-summary";
import type { FunnelStageRow } from "@/lib/validators/funnel-conversion";
import type { RankedGeographicYieldRow } from "@/lib/validators/geographic-yield";
import {
  LEADERBOARD_METRIC_LABELS,
  type LeaderboardMetric,
  type LeaderboardRow,
} from "@/lib/validators/team-leaderboard";
import type { CsvCellValue } from "@/lib/csv/build-csv";

type CsvTable = {
  headers: string[];
  rows: CsvCellValue[][];
};

export function dailyRepSummaryToCsv(rows: DailyRepSummaryRow[]): CsvTable {
  return {
    headers: ["Rep", "Doors", "Calls", "Leads", "Appts"],
    rows: rows.map((row) => [
      row.rep_name,
      row.doors,
      row.calls,
      row.leads_added,
      row.appointments_set,
    ]),
  };
}

export function teamLeaderboardToCsv(
  rows: LeaderboardRow[],
  metric: LeaderboardMetric,
): CsvTable {
  const metricLabel = LEADERBOARD_METRIC_LABELS[metric];

  return {
    headers: ["Rank", "Rep", metricLabel],
    rows: rows.map((row) => [row.rank, row.rep_name, row.value]),
  };
}

export function geographicYieldToCsv(
  rows: RankedGeographicYieldRow[],
): CsvTable {
  return {
    headers: [
      "Rank",
      "Suburb",
      "Doors",
      "Interested",
      "Leads",
      "Interested %",
    ],
    rows: rows.map((row) => [
      row.rank,
      row.suburb,
      row.doors,
      row.interested,
      row.leads_added,
      row.interested_pct,
    ]),
  };
}

export function funnelConversionToCsv(stages: FunnelStageRow[]): CsvTable {
  return {
    headers: ["Stage", "Count"],
    rows: stages.map((stage) => [stage.label, stage.count]),
  };
}
