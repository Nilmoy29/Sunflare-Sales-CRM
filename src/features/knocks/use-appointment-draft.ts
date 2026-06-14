"use client";

import { useCallback, useState } from "react";
import type { KnockDraft } from "@/lib/validators/knocks";

export function useAppointmentDraft() {
  const [draft, setDraft] = useState<KnockDraft | null>(null);

  const openDraft = useCallback((next: KnockDraft) => {
    setDraft(next);
  }, []);

  const closeDraft = useCallback(() => {
    setDraft(null);
  }, []);

  return {
    draft,
    isOpen: draft !== null,
    openDraft,
    closeDraft,
  };
}
