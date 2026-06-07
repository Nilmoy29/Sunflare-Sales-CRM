"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchDailyRepSummary } from "@/features/admin/api";
import { rankRepMetrics } from "@/features/dashboard/rank-rep-metrics";
import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import type { DailyRepSummaryRow } from "@/lib/validators/daily-rep-summary";
import type { LeaderboardMetric } from "@/lib/validators/team-leaderboard";

export function useTeamLeaderboard() {
  const { from, to } = useDashboardDateRange();
  const [metric, setMetric] = useState<LeaderboardMetric>("doors");
  const [summaryRows, setSummaryRows] = useState<DailyRepSummaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const rangeKey = `${from}:${to}`;
  const loading = loadedKey !== rangeKey;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const result = await fetchDailyRepSummary(from, to, controller.signal);
        if (cancelled) {
          return;
        }
        setSummaryRows(result.rows);
        setError(null);
        setLoadedKey(rangeKey);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setSummaryRows([]);
        setError(
          e instanceof Error ? e.message : "Could not load team leaderboard",
        );
        setLoadedKey(rangeKey);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [from, to, rangeKey]);

  const rows = useMemo(
    () => rankRepMetrics(summaryRows, metric),
    [summaryRows, metric],
  );

  return {
    from,
    to,
    metric,
    setMetric,
    rows,
    loading,
    error,
  };
}
