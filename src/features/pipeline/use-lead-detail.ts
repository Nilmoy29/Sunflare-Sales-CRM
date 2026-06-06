"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLeadDetail } from "@/features/pipeline/api";
import type { LeadDetailResponse } from "@/lib/validators/lead-detail";

export function useLeadDetail(leadId: string) {
  const [data, setData] = useState<LeadDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const requestKey = useMemo(
    () => `${leadId}:${refreshKey}`,
    [leadId, refreshKey],
  );
  const loading = loadedKey !== requestKey;
  const initialLoading = loadedKey === null && loading;
  const reloading = loadedKey !== null && loading;

  const reload = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const key = requestKey;

    async function load() {
      try {
        const result = await fetchLeadDetail(leadId, controller.signal);
        if (cancelled) {
          return;
        }
        setData(result);
        setError(null);
        setLoadedKey(key);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setData(null);
        setError(
          e instanceof Error ? e.message : "Could not load lead detail",
        );
        setLoadedKey(key);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [leadId, requestKey]);

  return {
    data: initialLoading ? null : data,
    loading: initialLoading,
    reloading,
    error,
    reload,
  };
}
