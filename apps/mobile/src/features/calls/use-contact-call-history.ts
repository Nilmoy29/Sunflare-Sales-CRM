import { useEffect, useState } from "react";
import { fetchContactCallHistory } from "@/features/calls/api";
import type { ContactCallHistoryItem } from "@/features/calls/types";

export function useContactCallHistory(
  contactId: string | null,
  refreshKey = 0,
) {
  const [calls, setCalls] = useState<ContactCallHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contactId) {
      setCalls([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const activeContactId = contactId;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchContactCallHistory(
          activeContactId,
          controller.signal,
        );
        if (!cancelled) {
          setCalls(result.calls);
        }
      } catch (err) {
        if (!cancelled) {
          setCalls([]);
          setError(
            err instanceof Error ? err.message : "Could not load call history",
          );
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
      controller.abort();
    };
  }, [contactId, refreshKey]);

  return { calls, loading, error };
}
