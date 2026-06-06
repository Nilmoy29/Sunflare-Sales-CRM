"use client";

import { useCallback, useEffect, useRef } from "react";
import { syncPendingKnocks } from "@/features/knocks/api";
import {
  listPendingKnockRows,
  markKnocksPending,
  markKnocksSyncing,
  pendingRowToSyncItem,
  removePendingKnock,
} from "@/features/knocks/pending-knocks-store";
import { SYNC_KNOCKS_MAX_BATCH } from "@/lib/validators/knocks";

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

  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  const runSync = useCallback(async () => {
    if (!enabled || syncingRef.current) {
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    const rows = await listPendingKnockRows(["pending", "syncing"]);
    if (rows.length === 0) {
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

          anySynced = true;
        } catch {
          await markKnocksPending(clientIds);
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

    const handleOnline = () => {
      void runSync();
    };

    window.addEventListener("online", handleOnline);
    const interval = window.setInterval(() => {
      void runSync();
    }, SYNC_POLL_MS);

    void runSync();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.clearInterval(interval);
    };
  }, [enabled, runSync]);
}
