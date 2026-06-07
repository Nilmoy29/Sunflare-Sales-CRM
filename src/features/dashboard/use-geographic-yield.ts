"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchGeographicYield } from "@/features/dashboard/api";
import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import { rankGeographicYield } from "@/features/dashboard/rank-geographic-yield";
import type { GeographicYieldRow } from "@/lib/validators/geographic-yield";
import type { GeographicYieldMetric } from "@/lib/validators/geographic-yield";

export function useGeographicYield() {
  const { from, to } = useDashboardDateRange();
  const [metric, setMetric] = useState<GeographicYieldMetric>("interested_pct");
  const [rows, setRows] = useState<GeographicYieldRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const rangeKey = `${from}:${to}`;
  const loading = loadedKey !== rangeKey;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const result = await fetchGeographicYield(from, to, controller.signal);
        if (cancelled) {
          return;
        }
        setRows(result.rows);
        setError(null);
        setLoadedKey(rangeKey);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setRows([]);
        setError(
          e instanceof Error ? e.message : "Could not load geographic yield",
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

  const rankedRows = useMemo(
    () => rankGeographicYield(rows, metric),
    [rows, metric],
  );

  return {
    from,
    to,
    metric,
    setMetric,
    rows: rankedRows,
    loading,
    error,
  };
}
