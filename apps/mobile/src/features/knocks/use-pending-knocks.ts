import { useCallback, useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  countPendingKnocks,
  pendingKnocksToMapPins,
} from "@/lib/sqlite/pending-knocks";
import type { PendingKnockPin } from "@/features/knocks/types";

const POLL_MS = 2_000;

export function usePendingKnocks() {
  const [pendingKnocks, setPendingKnocks] = useState<PendingKnockPin[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    const [count, pins] = await Promise.all([
      countPendingKnocks(),
      pendingKnocksToMapPins(),
    ]);
    setPendingCount(count);
    setPendingKnocks(pins);
  }, []);

  useEffect(() => {
    void refresh();

    const interval = setInterval(() => {
      void refresh();
    }, POLL_MS);

    const unsubscribe = NetInfo.addEventListener(() => {
      void refresh();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [refresh]);

  return { pendingKnocks, pendingCount, refreshPendingKnocks: refresh };
}
