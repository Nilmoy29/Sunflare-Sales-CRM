"use client";

import { useEffect, useState } from "react";
import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import type { TeamActivityTrendResponse } from "@/lib/validators/team-activity-trend";
import type { LeaderboardMetric } from "@/lib/validators/team-leaderboard";

async function fetchTeamActivityTrend(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<TeamActivityTrendResponse> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(
    `/api/v1/admin/dashboard/activity-trend?${params.toString()}`,
    { credentials: "include", signal },
  );

  const body = (await res.json()) as {
    data?: TeamActivityTrendResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load activity trend");
  }

  if (!body.data) {
    throw new Error("Could not load activity trend");
  }

  return body.data;
}

export function useTeamActivityTrend() {
  const { from, to } = useDashboardDateRange();
  const [metric, setMetric] = useState<LeaderboardMetric>("doors");
  const [days, setDays] = useState<TeamActivityTrendResponse["days"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const rangeKey = `${from}:${to}`;
  const loading = loadedKey !== rangeKey;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const result = await fetchTeamActivityTrend(from, to, controller.signal);
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
          e instanceof Error ? e.message : "Could not load activity trend",
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

  return { from, to, metric, setMetric, days, loading, error };
}
