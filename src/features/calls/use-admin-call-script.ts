"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminCallScript,
  updateAdminCallScript,
} from "@/features/calls/api";

export function useAdminCallScript() {
  const [body, setBody] = useState("");
  const [savedBody, setSavedBody] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchAdminCallScript(controller.signal);
        if (cancelled) {
          return;
        }
        setBody(result.body);
        setSavedBody(result.body);
        setUpdatedAt(result.updated_at);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Could not load call script",
        );
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
  }, []);

  const save = useCallback(async (nextBody: string) => {
    setSaving(true);
    setSaveError(null);

    try {
      const result = await updateAdminCallScript(nextBody);
      setBody(result.body);
      setSavedBody(result.body);
      setUpdatedAt(result.updated_at);
      setLastSavedAt(Date.now());
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save call script",
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const dirty = body !== savedBody;

  return {
    body,
    setBody,
    updatedAt,
    loading,
    error,
    saving,
    saveError,
    save,
    dirty,
    lastSavedAt,
  };
}
