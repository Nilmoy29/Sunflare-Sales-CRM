import { useCallback, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { SYNC_KNOCKS_MAX_BATCH, syncPendingKnocks } from "@/features/knocks/api";
import {
  listPendingKnockRows,
  markKnocksPending,
  markKnocksSyncing,
  pendingRowToSyncItem,
  removePendingKnock,
} from "@/lib/sqlite/pending-knocks";

const SYNC_POLL_MS = 10_000;

type UseKnockSyncLoopOptions = {
  enabled: boolean;
  onSynced?: () => void;
};

export function useKnockSyncLoop({
  enabled,
  onSynced,
}: UseKnockSyncLoopOptions) {
  const syncingRef = useRef(false);
  const onSyncedRef = useRef(onSynced);
  const [syncBlockedMessage, setSyncBlockedMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  const runSync = useCallback(async () => {
    if (!enabled || syncingRef.current) {
      return;
    }

    const net = await NetInfo.fetch();
    if (net.isConnected !== true) {
      return;
    }

    const rows = await listPendingKnockRows(["pending", "syncing"]);
    if (rows.length === 0) {
      setSyncBlockedMessage(null);
      return;
    }

    syncingRef.current = true;
    let anySynced = false;

    try {
      for (let offset = 0; offset < rows.length; offset += SYNC_KNOCKS_MAX_BATCH) {
        const chunk = rows.slice(offset, offset + SYNC_KNOCKS_MAX_BATCH);
        const clientIds = chunk.map((row) => row.client_id);

        try {
          await markKnocksSyncing(clientIds);
          const payload = await Promise.all(
            chunk.map((row) => pendingRowToSyncItem(row)),
          );
          const results = await syncPendingKnocks(payload);

          for (const result of results) {
            await removePendingKnock(result.client_id);
          }

          setSyncBlockedMessage(null);
          anySynced = true;
        } catch (error: unknown) {
          await markKnocksPending(clientIds);
          const code =
            error instanceof Error && "code" in error
              ? (error as Error & { code?: string }).code
              : undefined;
          if (code === "NO_ACTIVE_SHIFT") {
            setSyncBlockedMessage("Start a shift to sync pending knocks");
          }
        }
      }

      if (anySynced) {
        onSyncedRef.current?.();
      }
    } finally {
      syncingRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void runSync();
      }
    });

    const interval = setInterval(() => {
      void runSync();
    }, SYNC_POLL_MS);

    void runSync();

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [enabled, runSync]);

  return { syncBlockedMessage };
}
