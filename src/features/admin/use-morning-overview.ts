"use client";

import { useEffect, useState } from "react";
import { fetchMorningOverview } from "@/features/admin/api";
import type { MorningOverviewResponse } from "@/lib/validators/dashboard-coaching";

export function useMorningOverview(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [overview, setOverview] = useState<MorningOverviewResponse | null>(null);
  const [loaded, setLoaded] = useState(!enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const result = await fetchMorningOverview(controller.signal);
        if (cancelled) {
          return;
        }
        setOverview(result);
        setError(null);
        setLoaded(true);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setError(
          e instanceof Error ? e.message : "Could not load morning overview",
        );
        setLoaded(true);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled]);

  return {
    overview: enabled ? overview : null,
    loading: enabled && !loaded,
    error: enabled ? error : null,
  };
}
