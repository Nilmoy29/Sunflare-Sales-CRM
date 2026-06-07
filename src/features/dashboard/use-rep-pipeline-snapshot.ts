"use client";

import { useEffect, useState } from "react";
import { fetchRepPipelineSnapshot } from "@/features/dashboard/api";
import type { RepPipelineStageRow } from "@/lib/validators/rep-deep-dive";

export function useRepPipelineSnapshot(repId: string) {
  const [stages, setStages] = useState<RepPipelineStageRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const loading = loadedKey !== repId;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const result = await fetchRepPipelineSnapshot(repId, controller.signal);
        if (cancelled) {
          return;
        }
        setStages(result.stages);
        setError(null);
        setLoadedKey(repId);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setStages([]);
        setError(
          e instanceof Error
            ? e.message
            : "Could not load rep pipeline snapshot",
        );
        setLoadedKey(repId);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [repId]);

  return { stages, loading, error };
}
