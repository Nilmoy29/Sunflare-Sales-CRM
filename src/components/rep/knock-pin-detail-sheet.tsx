"use client";

import { useEffect } from "react";
import { formatKnockHistoryDate } from "@/features/knocks/format-knock-date";
import {
  DOOR_OUTCOME_COLORS,
  DOOR_OUTCOME_LABELS,
} from "@/lib/geo/door-outcome-colors";
import type { SelectedMapKnockPin } from "@/lib/validators/knocks";

type KnockPinDetailSheetProps = {
  knock: SelectedMapKnockPin;
  onClose: () => void;
  onKnockAgain: (coords: { lat: number; lng: number }) => void;
};

function formatKnockWhen(knockedAt: string): string {
  if (Number.isNaN(Date.parse(knockedAt))) {
    return "Unknown time";
  }
  return formatKnockHistoryDate(knockedAt);
}

export function KnockPinDetailSheet({
  knock,
  onClose,
  onKnockAgain,
}: KnockPinDetailSheetProps) {
  const color = DOOR_OUTCOME_COLORS[knock.outcome];
  const label = DOOR_OUTCOME_LABELS[knock.outcome];
  const when = formatKnockWhen(knock.knocked_at);
  const hasCoords =
    Number.isFinite(knock.lat) && Number.isFinite(knock.lng);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-20">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close knock details"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="knock-pin-detail-title"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[50vh] overflow-y-auto rounded-t-2xl border-t border-zinc-300 bg-white p-4 sheet-bottom shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="knock-pin-detail-title"
              className="text-lg font-semibold text-zinc-950"
            >
              Knock details
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{when}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {label}
          </span>
          {knock.pending ? (
            <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950">
              Pending sync
            </span>
          ) : null}
        </div>

        {hasCoords ? (
          <p className="mb-4 text-sm text-zinc-600">
            {knock.lat.toFixed(5)}, {knock.lng.toFixed(5)}
          </p>
        ) : null}

        {hasCoords ? (
          <button
            type="button"
            onClick={() => onKnockAgain({ lat: knock.lat, lng: knock.lng })}
            className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Knock again here
          </button>
        ) : null}
      </div>
    </div>
  );
}
