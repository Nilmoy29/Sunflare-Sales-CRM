"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDailyRepSummary } from "@/features/admin/api";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import type { DailyRepSummaryRow } from "@/lib/validators/daily-rep-summary";

export function useDailyRepSummary() {
  const [date, setDateState] = useState(() => formatSydneyDateString(new Date()));
  const [rows, setRows] = useState<DailyRepSummaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const loading = loadedKey !== date;

  const setDate = useCallback((next: string) => {
    setDateState(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const result = await fetchDailyRepSummary(date, controller.signal);
        if (cancelled) {
          return;
        }
        setRows(result.rows);
        setError(null);
        setLoadedKey(date);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setError(
          e instanceof Error
            ? e.message
            : "Could not load daily rep summary",
        );
        setLoadedKey(date);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [date]);

  return { date, setDate, rows, loading, error };
}
