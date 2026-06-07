"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchActivityItem, fetchRecentActivity } from "@/features/admin/api";
import {
  ACTIVITY_FEED_DEFAULT_LIMIT,
  ACTIVITY_FEED_MAX_ITEMS,
  type ActivityFeedItem,
} from "@/lib/validators/activity-feed";

const REALTIME_CHANNEL = "admin-activity-door-knocks";

function prependItem(
  items: ActivityFeedItem[],
  item: ActivityFeedItem,
): ActivityFeedItem[] {
  if (items.some((existing) => existing.id === item.id)) {
    return items;
  }
  const next = [item, ...items];
  return next.length > ACTIVITY_FEED_MAX_ITEMS
    ? next.slice(0, ACTIVITY_FEED_MAX_ITEMS)
    : next;
}

export function useAdminActivityFeed(options?: {
  from: string;
  to: string;
  realtimeEnabled: boolean;
  onNewActivity?: () => void;
}) {
  const from = options?.from;
  const to = options?.to;
  const realtimeEnabled = options?.realtimeEnabled ?? false;
  const onNewActivity = options?.onNewActivity;
  const rangeKey = from && to ? `${from}:${to}` : null;

  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);

  const loading = Boolean(rangeKey) && loadedKey !== rangeKey;

  const enrichAndPrepend = useCallback(async (knockId: string) => {
    try {
      const item = await fetchActivityItem(knockId);
      setItems((current) => prependItem(current, item));
    } catch {
      setRealtimeError("Could not load latest activity item");
    }
  }, []);

  useEffect(() => {
    if (!from || !to || !rangeKey) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadInitial() {
      try {
        const result = await fetchRecentActivity(
          ACTIVITY_FEED_DEFAULT_LIMIT,
          from,
          to,
          controller.signal,
        );
        if (cancelled) {
          return;
        }
        setItems(result.items);
        setError(null);
        setLoadedKey(rangeKey);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        setItems([]);
        setError(
          e instanceof Error ? e.message : "Could not load activity feed",
        );
        setLoadedKey(rangeKey);
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [from, to, rangeKey]);

  useEffect(() => {
    if (!realtimeEnabled) {
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel(REALTIME_CHANNEL)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "door_knocks" },
        (payload) => {
          const knockId = (payload.new as { id?: string }).id;
          if (knockId) {
            onNewActivity?.();
            void enrichAndPrepend(knockId);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
          setRealtimeError(null);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeConnected(false);
          setRealtimeError("Live updates disconnected");
        } else if (status === "CLOSED") {
          setRealtimeConnected(false);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enrichAndPrepend, onNewActivity, realtimeEnabled]);

  return {
    items,
    loading,
    error,
    realtimeConnected: realtimeEnabled && realtimeConnected,
    realtimeError: realtimeEnabled ? realtimeError : null,
  };
}
