"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchLowActivityReps } from "@/features/admin/api";
import type { LowActivityRep } from "@/lib/validators/dashboard-coaching";

export function useLowActivityReps(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [flagged, setFlagged] = useState<LowActivityRep[]>([]);
  const [windowMinutes, setWindowMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const loading = enabled && loadedKey !== refreshKey;

  const refetch = useCallback(() => {
    if (!enabled) {
      return;
    }
    setRefreshKey((key) => key + 1);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

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
  }, [refreshKey, enabled]);

  return {
    flagged: enabled ? flagged : [],
    windowMinutes: enabled ? windowMinutes : null,
    loading,
    error: enabled ? error : null,
    refetch,
  };
}
