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

function mergeActivityItems(
  primary: ActivityFeedItem[],
  secondary: ActivityFeedItem[],
): ActivityFeedItem[] {
  const byId = new Map<string, ActivityFeedItem>();
  for (const item of [...primary, ...secondary]) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values())
    .sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    )
    .slice(0, ACTIVITY_FEED_MAX_ITEMS);
}

export function useAdminActivityFeed(options?: {
  onNewActivity?: () => void;
}) {
  const onNewActivity = options?.onNewActivity;
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);

  const enrichAndPrepend = useCallback(async (knockId: string) => {
    try {
      const item = await fetchActivityItem(knockId);
      setItems((current) => prependItem(current, item));
    } catch {
      setRealtimeError("Could not load latest activity item");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadInitial() {
      try {
        const result = await fetchRecentActivity(
          ACTIVITY_FEED_DEFAULT_LIMIT,
          controller.signal,
        );
        if (cancelled) {
          return;
        }
        setItems((current) => mergeActivityItems(result.items, current));
        setError(null);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        setItems([]);
        setError(
          e instanceof Error ? e.message : "Could not load activity feed",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
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
  }, [enrichAndPrepend, onNewActivity]);

  return {
    items,
    loading,
    error,
    realtimeConnected,
    realtimeError,
  };
}
