"use client";

import { useEffect, useState } from "react";
import { fetchMorningOverview } from "@/features/admin/api";
import type { MorningOverviewResponse } from "@/lib/validators/dashboard-coaching";

export function useMorningOverview() {
  const [overview, setOverview] = useState<MorningOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  return { overview, loading, error };
}
