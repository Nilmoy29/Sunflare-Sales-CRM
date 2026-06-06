"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchLowActivityReps } from "@/features/admin/api";
import type { LowActivityRep } from "@/lib/validators/dashboard-coaching";

export function useLowActivityReps() {
  const [flagged, setFlagged] = useState<LowActivityRep[]>([]);
  const [windowMinutes, setWindowMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const loading = loadedKey !== refreshKey;

  const refetch = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const key = refreshKey;

    async function load() {
      try {
        const result = await fetchLowActivityReps(undefined, controller.signal);
        if (cancelled) {
          return;
        }
        setFlagged(result.flagged);
        setWindowMinutes(result.window_minutes);
        setError(null);
        setLoadedKey(key);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setError(
          e instanceof Error ? e.message : "Could not load low-activity reps",
        );
        setLoadedKey(key);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [refreshKey]);

  return {
    flagged,
    windowMinutes,
    loading,
    error,
    refetch,
  };
}
