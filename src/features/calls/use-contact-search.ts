"use client";

import { useEffect, useState } from "react";
import { fetchContactSearch } from "@/features/calls/api";
import { CONTACT_SEARCH_MIN_LENGTH } from "@/lib/validators/contacts";
import type { ContactSearchResult } from "@/lib/validators/contacts";

const SEARCH_DEBOUNCE_MS = 300;

export function useContactSearch(query: string) {
  const trimmed = query.trim();
  const canSearch = trimmed.length >= CONTACT_SEARCH_MIN_LENGTH;

  const [contacts, setContacts] = useState<ContactSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canSearch) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      fetchContactSearch(trimmed, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) {
            return;
          }
          setContacts(result.contacts);
          setError(null);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          setContacts([]);
          setError(
            err instanceof Error ? err.message : "Could not search contacts",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [canSearch, trimmed]);

  return {
    contacts: canSearch ? contacts : [],
    loading: canSearch ? loading : false,
    error: canSearch ? error : null,
  };
}
