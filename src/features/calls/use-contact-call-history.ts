"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchContactCallHistory } from "@/features/calls/api";
import type { ContactCallHistoryItem } from "@/lib/validators/lead-detail";

export function useContactCallHistory(
  contactId: string | null,
  refreshKey = 0,
) {
  const [calls, setCalls] = useState<ContactCallHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const requestKey = useMemo(
    () => (contactId ? `${contactId}:${refreshKey}` : null),
    [contactId, refreshKey],
  );

  const pending = requestKey !== null && loadedKey !== requestKey;
  const loadedContactId = loadedKey?.split(":")[0] ?? null;
  const contactChanged =
    contactId !== null &&
    loadedContactId !== null &&
    contactId !== loadedContactId;
  const initialLoading = contactId !== null && loadedKey === null && pending;

  useEffect(() => {
    if (!requestKey || !contactId) {
      return;
    }

    const activeContactId = contactId;
    let cancelled = false;
    const controller = new AbortController();
    const key = requestKey;

    async function load() {
      setError(null);

      try {
        const result = await fetchContactCallHistory(
          activeContactId,
          controller.signal,
        );
        if (cancelled) {
          return;
        }
        setCalls(result.calls);
        setError(null);
        setLoadedKey(key);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setCalls([]);
        setError(
          err instanceof Error ? err.message : "Could not load call history",
        );
        setLoadedKey(key);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [contactId, requestKey]);

  const replaceCall = useCallback((call: ContactCallHistoryItem) => {
    setCalls((prev) => prev.map((item) => (item.id === call.id ? call : item)));
  }, []);

  const removeCall = useCallback((callId: string) => {
    setCalls((prev) => prev.filter((item) => item.id !== callId));
  }, []);

  return {
    calls: pending && contactChanged ? [] : calls,
    loading: initialLoading,
    reloading: !initialLoading && pending,
    error: contactId ? error : null,
    replaceCall,
    removeCall,
  };
}
