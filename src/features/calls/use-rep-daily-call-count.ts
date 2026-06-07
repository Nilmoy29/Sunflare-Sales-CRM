"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRepDailyCallCount } from "@/features/calls/api";

export function useRepDailyCallCount(refreshKey = 0) {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const requestKey = useMemo(() => `today:${refreshKey}`, [refreshKey]);
  const pending = loadedKey !== requestKey;
  const initialLoading = loadedKey === null && pending;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const key = requestKey;

    async function load() {
      setError(null);

      try {
        const result = await fetchRepDailyCallCount(controller.signal);
        if (cancelled) {
          return;
        }
        setCount(result.count);
        setError(null);
        setLoadedKey(key);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setCount(null);
        setError(
          err instanceof Error ? err.message : "Could not load call count",
        );
        setLoadedKey(key);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [requestKey]);

  return {
    count: initialLoading ? null : count,
    loading: initialLoading,
    reloading: !initialLoading && pending,
    error,
  };
}
