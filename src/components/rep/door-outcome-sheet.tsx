"use client";

import { useEffect, useState } from "react";
import { fetchReverseGeocode } from "@/features/knocks/api";
import {
  formatKnockHistoryDate,
  repDisplayFirstName,
} from "@/features/knocks/format-knock-date";
import { submitKnock, type SubmitKnockResult } from "@/features/knocks/submit-knock";
import { usePriorKnocks } from "@/features/knocks/use-prior-knocks";
import {
  DOOR_OUTCOME_COLORS,
  DOOR_OUTCOME_LABELS,
} from "@/lib/geo/door-outcome-colors";
import type { DoorOutcome } from "@/lib/validators/enums";
import { DOOR_OUTCOMES } from "@/lib/validators/enums";
import { isPromotableDoorOutcome } from "@/lib/validators/leads";
import {
  ADDRESS_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  POSTCODE_MAX_LENGTH,
  SUBURB_MAX_LENGTH,
  type KnockDraft,
} from "@/lib/validators/knocks";

type DoorOutcomeSheetProps = {
  draft: KnockDraft;
  onClose: () => void;
  onSuccess: (result: SubmitKnockResult) => void;
};

function parseFollowUpLocal(value: string): { ok: true; iso: string | null } | { ok: false } {
  if (!value.trim()) {
    return { ok: true, iso: null };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false };
  }
  return { ok: true, iso: date.toISOString() };
}

function toNullableField(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function DoorOutcomeSheet({
  draft,
  onClose,
  onSuccess,
}: DoorOutcomeSheetProps) {
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [geocodeLoading, setGeocodeLoading] = useState(true);
  const [geocodeHint, setGeocodeHint] = useState<string | null>(null);

  const [selectedOutcome, setSelectedOutcome] = useState<DoorOutcome | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [followUpLocal, setFollowUpLocal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    priorKnocks,
    duplicateAlert,
    loading: historyLoading,
    offline: historyOffline,
    error: historyError,
  } = usePriorKnocks(draft.lat, draft.lng);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAddress() {
      try {
        const result = await fetchReverseGeocode(
          draft.lat,
          draft.lng,
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }

        if (result.status === "ok") {
          setAddress(result.data.address ?? "");
          setSuburb(result.data.suburb ?? "");
          setPostcode(result.data.postcode ?? "");
          return;
        }

        if (result.status === "not_configured") {
          setGeocodeHint(
            "Address lookup is not configured. Enter the address manually or add MAPBOX_SECRET_TOKEN — see docs/SETUP_KEYS.md",
          );
          return;
        }

        setGeocodeHint(
          "Could not look up the address. You can enter it manually.",
        );
      } catch (e: unknown) {
        if (controller.signal.aborted) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setGeocodeHint(
          "Could not look up the address. You can enter it manually.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setGeocodeLoading(false);
        }
      }
    }

    void loadAddress();

    return () => {
      controller.abort();
    };
  }, [draft.lat, draft.lng]);

  const handleSave = async () => {
    if (!selectedOutcome || submitting) {
      return;
    }

    const followUp = parseFollowUpLocal(followUpLocal);
    if (!followUp.ok) {
      setError("Enter a valid follow-up date and time.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitKnock({
        lat: draft.lat,
        lng: draft.lng,
        outcome: selectedOutcome,
        notes: notes.trim() ? notes.trim() : null,
        follow_up_at: followUp.iso,
        address: toNullableField(address),
        suburb: toNullableField(suburb),
        postcode: toNullableField(postcode),
      });
      onSuccess(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save knock");
    } finally {
      setSubmitting(false);
    }
  };

  const addressFieldsDisabled = submitting;
  const showPromotionHint =
    selectedOutcome !== null && isPromotableDoorOutcome(selectedOutcome);

  return (
    <div className="fixed inset-0 z-20">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close knock form"
        onClick={() => {
          if (!submitting) {
            onClose();
          }
        }}
        disabled={submitting}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="door-outcome-sheet-title"
        className="fixed inset-x-0 bottom-0 z-30 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 shadow-xl ring-1 ring-zinc-200"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="door-outcome-sheet-title"
              className="text-lg font-semibold text-zinc-900"
            >
              Log door knock
            </h2>
            <p className="mt-1 font-mono text-sm text-zinc-600">
              {draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60"
            aria-label="Close"
          >
            <span aria-hidden className="text-2xl leading-none">
              ×
            </span>
          </button>
        </div>

        {historyOffline ? (
          <p className="mb-4 text-sm text-zinc-500">
            History unavailable offline
          </p>
        ) : null}

        {!historyOffline && historyError ? (
          <p className="mb-4 text-sm text-zinc-500">{historyError}</p>
        ) : null}

        {!historyOffline && duplicateAlert ? (
          <div
            className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200"
            role="status"
          >
            Already knocked today by {duplicateAlert.rep_name} at{" "}
            {formatKnockHistoryDate(duplicateAlert.knocked_at)} (
            {DOOR_OUTCOME_LABELS[duplicateAlert.outcome]})
          </div>
        ) : null}

        {!historyOffline && (historyLoading || priorKnocks.length > 0) ? (
          <div className="mb-4 space-y-2">
            <p className="text-sm font-medium text-zinc-900">Prior knocks</p>
            {historyLoading ? (
              <p className="text-sm text-zinc-500">Loading history…</p>
            ) : (
              <ul className="space-y-2">
                {priorKnocks.map((knock) => (
                  <li
                    key={knock.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm ring-1 ring-zinc-200"
                  >
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                      style={{
                        backgroundColor: DOOR_OUTCOME_COLORS[knock.outcome],
                      }}
                    >
                      {DOOR_OUTCOME_LABELS[knock.outcome]}
                    </span>
                    <span className="text-zinc-600">
                      {formatKnockHistoryDate(knock.knocked_at)}
                    </span>
                    <span className="font-medium text-zinc-900">
                      {repDisplayFirstName(knock.rep_name, knock.is_own)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-900">Address</p>
          {geocodeLoading ? (
            <p className="text-sm text-zinc-500">Looking up address…</p>
          ) : null}
          <div className="space-y-2">
            <label htmlFor="knock-address" className="sr-only">
              Street address
            </label>
            <input
              id="knock-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={addressFieldsDisabled}
              maxLength={ADDRESS_MAX_LENGTH}
              placeholder="Street address"
              className="min-h-11 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-50"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="knock-suburb" className="sr-only">
                  Suburb
                </label>
                <input
                  id="knock-suburb"
                  type="text"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  disabled={addressFieldsDisabled}
                  maxLength={SUBURB_MAX_LENGTH}
                  placeholder="Suburb"
                  className="min-h-11 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-50"
                />
              </div>
              <div>
                <label htmlFor="knock-postcode" className="sr-only">
                  Postcode
                </label>
                <input
                  id="knock-postcode"
                  type="text"
                  inputMode="numeric"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  disabled={addressFieldsDisabled}
                  maxLength={POSTCODE_MAX_LENGTH}
                  placeholder="Postcode"
                  className="min-h-11 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-50"
                />
              </div>
            </div>
          </div>
          {geocodeHint ? (
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 ring-1 ring-zinc-200">
              {geocodeHint}
            </p>
          ) : null}
        </div>

        <fieldset className="mt-4 space-y-3">
          <legend className="text-sm font-medium text-zinc-900">Outcome</legend>
          <div className="grid grid-cols-2 gap-2">
            {DOOR_OUTCOMES.map((outcome) => {
              const selected = selectedOutcome === outcome;
              return (
                <button
                  key={outcome}
                  type="button"
                  onClick={() => setSelectedOutcome(outcome)}
                  disabled={submitting}
                  className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm ring-2 disabled:opacity-60 ${
                    selected ? "ring-zinc-900" : "ring-transparent"
                  }`}
                  style={{
                    backgroundColor: DOOR_OUTCOME_COLORS[outcome],
                  }}
                  aria-pressed={selected}
                >
                  {DOOR_OUTCOME_LABELS[outcome]}
                </button>
              );
            })}
          </div>
        </fieldset>

        {showPromotionHint ? (
          <p className="mt-3 text-sm text-emerald-700">
            Adds to pipeline when you save
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          <label
            htmlFor="knock-notes"
            className="text-sm font-medium text-zinc-900"
          >
            Notes (optional)
          </label>
          <textarea
            id="knock-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            maxLength={NOTES_MAX_LENGTH}
            rows={2}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
            placeholder="Quick notes…"
          />
        </div>

        <div className="mt-4 space-y-2">
          <label
            htmlFor="knock-follow-up"
            className="text-sm font-medium text-zinc-900"
          >
            Follow-up (optional)
          </label>
          <input
            id="knock-follow-up"
            type="datetime-local"
            value={followUpLocal}
            onChange={(e) => setFollowUpLocal(e.target.value)}
            disabled={submitting}
            className="min-h-11 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
          />
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-11 flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={!selectedOutcome || submitting}
            className="min-h-11 flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save knock"}
          </button>
        </div>
      </div>
    </div>
  );
}
