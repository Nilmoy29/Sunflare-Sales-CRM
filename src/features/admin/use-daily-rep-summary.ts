"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDailyRepSummary } from "@/features/admin/api";
import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import type { DailyRepSummaryRow } from "@/lib/validators/daily-rep-summary";

export function useDailyRepSummary() {
  const { from, to } = useDashboardDateRange();
  const [rows, setRows] = useState<DailyRepSummaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const rangeKey = `${from}:${to}`;
  const loadKey = `${rangeKey}:${refreshKey}`;
  const loading = loadedKey !== loadKey;

  const refetch = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const result = await fetchDailyRepSummary(from, to, controller.signal);
        if (cancelled) {
          return;
        }
        setRows(result.rows);
        setError(null);
        setLoadedKey(loadKey);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setError(
          e instanceof Error
            ? e.message
            : "Could not load daily rep summary",
        );
        setLoadedKey(loadKey);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [from, to, loadKey]);

  return { from, to, rows, loading, error, refetch };
}
