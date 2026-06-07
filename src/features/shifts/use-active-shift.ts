"use client";

import { useCallback, useEffect, useState } from "react";
import {
  endShift,
  fetchCurrentShift,
  startShift,
} from "@/features/shifts/api";
import type { RepDailySummary, ShiftSummary } from "@/lib/validators/shifts";

export function useActiveShift() {
  const [shift, setShift] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEndedSummary, setLastEndedSummary] =
    useState<RepDailySummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const current = await fetchCurrentShift();
        if (!cancelled) {
          setShift(current);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load shift");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const dismissEndedSummary = useCallback(() => {
    setLastEndedSummary(null);
  }, []);

  const onStart = useCallback(async () => {
    setBusy(true);
    setError(null);
    setLastEndedSummary(null);
    try {
      const next = await startShift();
      setShift(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start shift");
    } finally {
      setBusy(false);
    }
  }, []);

  const onEnd = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await endShift();
      setShift(null);
      setLastEndedSummary(result.daily_summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to end shift");
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    shift,
    isActive: shift !== null && shift.ended_at === null,
    loading,
    busy,
    error,
    lastEndedSummary,
    dismissEndedSummary,
    onStart,
    onEnd,
  };
}
