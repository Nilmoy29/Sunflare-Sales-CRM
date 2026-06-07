import type {
  GeographicYieldMetric,
  GeographicYieldRow,
  RankedGeographicYieldRow,
} from "@/lib/validators/geographic-yield";
import { computeInterestedPct } from "@/lib/validators/geographic-yield";

function sortValue(
  row: GeographicYieldRow,
  metric: GeographicYieldMetric,
): number {
  if (metric === "interested_pct") {
    const pct = computeInterestedPct(row.doors, row.interested);
    return pct ?? -1;
  }
  return row[metric];
}

export function rankGeographicYield(
  rows: GeographicYieldRow[],
  metric: GeographicYieldMetric,
): RankedGeographicYieldRow[] {
  const sorted = [...rows].sort((a, b) => {
    const byValue = sortValue(b, metric) - sortValue(a, metric);
    if (byValue !== 0) {
      return byValue;
    }
    return a.suburb.localeCompare(b.suburb);
  });

  const ranked: RankedGeographicYieldRow[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const row = sorted[index]!;
    const value = sortValue(row, metric);
    const rank =
      index === 0
        ? 1
        : value === sortValue(sorted[index - 1]!, metric)
          ? ranked[index - 1]!.rank
          : index + 1;

    ranked.push({
      rank,
      suburb: row.suburb,
      doors: row.doors,
      interested: row.interested,
      leads_added: row.leads_added,
      interested_pct: computeInterestedPct(row.doors, row.interested),
      sort_value: value,
    });
  }

  return ranked;
}
