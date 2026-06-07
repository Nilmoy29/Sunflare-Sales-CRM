"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchRepTerritoriesForDate } from "@/features/territories/api";
import type { RepTerritoryOverlay } from "@/lib/validators/territories";

type UseRepTerritoryOverlayOptions = {
  enabled: boolean;
};

export function useRepTerritoryOverlay({ enabled }: UseRepTerritoryOverlayOptions) {
  const [territories, setTerritories] = useState<RepTerritoryOverlay[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setTerritories([]);
      try {
        const result = await fetchRepTerritoriesForDate(controller.signal);
        if (cancelled) {
          return;
        }
        setTerritories(result.territories);
      } catch {
        if (cancelled) {
          return;
        }
        setTerritories([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, refreshKey]);

  return {
    territories: enabled && !loading ? territories : [],
    loading: enabled && loading,
    refresh,
  };
}
