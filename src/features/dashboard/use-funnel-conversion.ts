"use client";

import { useEffect, useState } from "react";
import { fetchFunnelConversion } from "@/features/dashboard/api";
import { useDashboardDateRange } from "@/features/dashboard/dashboard-date-range-context";
import type { FunnelStageRow } from "@/lib/validators/funnel-conversion";

export function useFunnelConversion() {
  const { from, to } = useDashboardDateRange();
  const [stages, setStages] = useState<FunnelStageRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const rangeKey = `${from}:${to}`;
  const loading = loadedKey !== rangeKey;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const result = await fetchFunnelConversion(from, to, controller.signal);
        if (cancelled) {
          return;
        }
        setStages(result.stages);
        setError(null);
        setLoadedKey(rangeKey);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setStages([]);
        setError(
          e instanceof Error ? e.message : "Could not load funnel conversion",
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

  return { from, to, stages, loading, error };
}
