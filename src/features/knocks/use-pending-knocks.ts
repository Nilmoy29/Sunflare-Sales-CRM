"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { pendingKnocksToMapPins } from "@/features/knocks/pending-knocks-store";
import { pendingKnocksDb } from "@/lib/offline/pending-knocks-db";
import type { PendingKnockPin } from "@/lib/validators/knocks";

export function usePendingKnocks() {
  const [pendingKnocks, setPendingKnocks] = useState<PendingKnockPin[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const subscription = liveQuery(async () => {
      const rows = await pendingKnocksDb.pending_knocks
        .where("status")
        .anyOf(["pending", "syncing"])
        .toArray();
      return {
        count: rows.length,
        pins: await pendingKnocksToMapPins(),
      };
    }).subscribe((value) => {
      if (!value) {
        return;
      }
      setPendingCount(value.count);
      setPendingKnocks(value.pins);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { pendingKnocks, pendingCount };
}
