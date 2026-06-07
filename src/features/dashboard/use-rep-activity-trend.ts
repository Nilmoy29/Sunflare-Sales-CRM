"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRepActivityTrend } from "@/features/dashboard/api";
import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import type { RepActivityTrendDay } from "@/lib/validators/rep-deep-dive";
import type { LeaderboardMetric } from "@/lib/validators/team-leaderboard";

export type RepPeriodTotals = {
  doors: number;
  calls: number;
  leads_added: number;
  appointments_set: number;
};

function sumDays(days: RepActivityTrendDay[]): RepPeriodTotals {
  return days.reduce(
    (totals, day) => ({
      doors: totals.doors + day.doors,
      calls: totals.calls + day.calls,
      leads_added: totals.leads_added + day.leads_added,
      appointments_set: totals.appointments_set + day.appointments_set,
    }),
    {
      doors: 0,
      calls: 0,
      leads_added: 0,
      appointments_set: 0,
    },
  );
}

export function useRepActivityTrend(repId: string) {
  const { from, to } = useDashboardDateRange();
  const [metric, setMetric] = useState<LeaderboardMetric>("doors");
  const [days, setDays] = useState<RepActivityTrendDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const rangeKey = `${repId}:${from}:${to}`;
  const loading = loadedKey !== rangeKey;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const result = await fetchRepActivityTrend(
          repId,
          from,
          to,
          controller.signal,
        );
        if (cancelled) {
          return;
        }
        setDays(result.days);
        setError(null);
        setLoadedKey(rangeKey);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setDays([]);
        setError(
          e instanceof Error ? e.message : "Could not load rep activity trend",
        );
        setLoadedKey(rangeKey);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [repId, from, to, rangeKey]);

  const periodTotals = useMemo(() => sumDays(days), [days]);

  const trendRows = useMemo(
    () =>
      days.map((day) => ({
        activity_date: day.activity_date,
        value: day[metric],
      })),
    [days, metric],
  );

  return {
    from,
    to,
    metric,
    setMetric,
    days: trendRows,
    periodTotals,
    loading,
    error,
  };
}
