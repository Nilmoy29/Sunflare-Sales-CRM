"use client";

import { useEffect, useState } from "react";
import { fetchShiftBreadcrumbs } from "@/features/admin/api";
import type { ShiftBreadcrumbsResponse } from "@/lib/validators/shift-breadcrumbs";

const EMPTY_BREADCRUMBS: ShiftBreadcrumbsResponse = {
  shift: null,
  points: [],
};

export function useShiftBreadcrumbs(
  repId: string | null,
  date: string | null,
  enabled: boolean,
) {
  const requestKey =
    enabled && repId && date ? `${repId}:${date}` : null;
  const [data, setData] = useState<ShiftBreadcrumbsResponse>(EMPTY_BREADCRUMBS);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const loading = requestKey !== null && loadedKey !== requestKey;

  useEffect(() => {
    if (!requestKey || !repId || !date) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const key = requestKey;
    const requestRepId = repId;
    const requestDate = date;

    async function load() {
      try {
        const result = await fetchShiftBreadcrumbs(
          requestRepId,
          requestDate,
          controller.signal,
        );
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
        setData(EMPTY_BREADCRUMBS);
        setError(
          e instanceof Error
            ? e.message
            : "Could not load shift breadcrumbs",
        );
        setLoadedKey(key);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [requestKey, repId, date]);

  if (!requestKey) {
    return { ...EMPTY_BREADCRUMBS, loading: false, error: null };
  }

  return {
    shift: loading ? null : data.shift,
    points: loading ? [] : data.points,
    loading,
    error,
  };
}
