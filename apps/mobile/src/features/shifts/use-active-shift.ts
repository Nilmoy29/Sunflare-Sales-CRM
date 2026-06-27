import { useCallback, useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  endShift,
  fetchCurrentShift,
  startShift,
} from "@/features/shifts/api";
import {
  startShiftGpsTracking,
  stopShiftGpsTracking,
} from "@/features/shifts/shift-gps-tracking";
import { flushPendingGpsPings } from "@/features/shifts/gps-ping-worker";
import type { RepShiftSummary, ShiftSummary } from "@/features/shifts/types";
import {
  ensureShiftLocationPermissions,
  openAppSettings,
} from "@/lib/location/permissions";

export function useActiveShift() {
  const [shift, setShift] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(
    null,
  );
  const [lastEndedSummary, setLastEndedSummary] =
    useState<RepShiftSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const current = await fetchCurrentShift();
        if (!cancelled) {
          setShift(current);
          if (current && current.ended_at === null) {
            await startShiftGpsTracking(current.id);
          }
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

  useEffect(() => {
    if (!shift || shift.ended_at !== null) {
      return;
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void flushPendingGpsPings(shift.id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [shift]);

  const onStart = useCallback(async () => {
    setBusy(true);
    setError(null);
    setPermissionMessage(null);
    setLastEndedSummary(null);

    try {
      const permission = await ensureShiftLocationPermissions();
      if (!permission.ok) {
        setPermissionMessage(permission.message);
        return;
      }

      const next = await startShift();
      await startShiftGpsTracking(next.id);
      setShift(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start shift");
    } finally {
      setBusy(false);
    }
  }, []);

  const onEnd = useCallback(async () => {
    if (!shift) {
      return;
    }

    setBusy(true);
    setError(null);
    const endingShiftId = shift.id;

    try {
      const result = await endShift();
      await stopShiftGpsTracking(endingShiftId);
      setShift(null);
      setLastEndedSummary(result.shift_summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to end shift");
    } finally {
      setBusy(false);
    }
  }, [shift]);

  const openSettings = useCallback(() => {
    openAppSettings();
  }, []);

  const dismissEndedSummary = useCallback(() => {
    setLastEndedSummary(null);
  }, []);

  return {
    shift,
    isActive: shift !== null && shift.ended_at === null,
    loading,
    busy,
    error,
    permissionMessage,
    lastEndedSummary,
    dismissEndedSummary,
    onStart,
    onEnd,
    openSettings,
  };
}
