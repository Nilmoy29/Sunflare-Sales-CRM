"use client";

import { useEffect, useState } from "react";
import { fetchCallScript } from "@/features/calls/api";

export function useCallScript() {
  const [body, setBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchCallScript(controller.signal);
        if (cancelled) {
          return;
        }
        setBody(result.body);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setBody(null);
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

  return { body, loading, error };
}
