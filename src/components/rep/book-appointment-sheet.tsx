"use client";

import { useState } from "react";
import { bookAppointment } from "@/features/knocks/book-appointment-api";
import { useReverseGeocodeAddress } from "@/features/knocks/use-reverse-geocode-address";
import type { BookAppointmentResponse } from "@/lib/validators/book-appointment";
import {
  CLOSER_NAME_MAX_LENGTH,
  CUSTOMER_NAME_MAX_LENGTH,
  PHONE_MAX_LENGTH,
} from "@/lib/validators/book-appointment";
import type { KnockDraft } from "@/lib/validators/knocks";
import { NOTES_MAX_LENGTH } from "@/lib/validators/knocks";

type BookAppointmentSheetProps = {
  draft: KnockDraft;
  territoryWarning?: string | null;
  onClose: () => void;
  onSuccess: (result: BookAppointmentResponse) => void;
};

type Step = "address" | "details";

function toNullableField(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function combineDateAndTime(date: string, time: string): string | null {
  if (!date || !time) {
    return null;
  }
  const combined = new Date(`${date}T${time}`);
  if (Number.isNaN(combined.getTime())) {
    return null;
  }
  return combined.toISOString();
}

export function BookAppointmentSheet({
  draft,
  territoryWarning = null,
  onClose,
  onSuccess,
}: BookAppointmentSheetProps) {
  const territoryWarningKey = `${draft.lat},${draft.lng},${territoryWarning ?? ""}`;
  const [dismissedTerritoryWarningKey, setDismissedTerritoryWarningKey] =
    useState<string | null>(null);
  const territoryWarningDismissed =
    dismissedTerritoryWarningKey === territoryWarningKey;

  const [step, setStep] = useState<Step>("address");
  const {
    address,
    suburb,
    postcode,
    setAddress,
    setSuburb,
    setPostcode,
    loading: geocodeLoading,
    hint: geocodeHint,
    addressMaxLength,
    suburbMaxLength,
    postcodeMaxLength,
  } = useReverseGeocodeAddress({ lat: draft.lat, lng: draft.lng });

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [notes, setNotes] = useState("");
  const [closerName, setCloserName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBook = async () => {
    if (submitting) {
      return;
    }

    const appointmentAt = combineDateAndTime(appointmentDate, appointmentTime);
    if (!appointmentAt) {
      setError("Enter a valid appointment date and time.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await bookAppointment({
        lat: draft.lat,
        lng: draft.lng,
        customer_name: customerName.trim(),
        phone: toNullableField(phone),
        appointment_at: appointmentAt,
        closer_name: closerName.trim(),
        notes: notes.trim() ? notes.trim() : null,
        address: toNullableField(address),
        suburb: toNullableField(suburb),
        postcode: toNullableField(postcode),
      });
      onSuccess(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const addressReady = !geocodeLoading;
  const canContinueAddress = addressReady && address.trim().length > 0;

  return (
    <div className="fixed inset-0 z-20">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close appointment form"
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
        aria-labelledby="book-appointment-sheet-title"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-zinc-300 bg-white p-4 sheet-bottom shadow-xl"
      >
        {territoryWarning && !territoryWarningDismissed ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
            <p className="flex-1">{territoryWarning}</p>
            <button
              type="button"
              onClick={() => setDismissedTerritoryWarningKey(territoryWarningKey)}
              className="shrink-0 font-medium underline hover:text-amber-950"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {step === "address" ? "Step 1 of 2" : "Step 2 of 2"}
            </p>
            <h2
              id="book-appointment-sheet-title"
              className="text-lg font-semibold text-zinc-950"
            >
              {step === "address" ? "Confirm address" : "Book appointment"}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {step === "address"
                ? "We located this property. Edit if needed, then continue."
                : "Add customer details and schedule the sit-down."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-60"
            aria-label="Close"
          >
            <span aria-hidden className="text-2xl leading-none">
              ×
            </span>
          </button>
        </div>

        {step === "address" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-900">
                Property location
              </p>
              <p className="mt-1 font-mono text-xs text-emerald-800">
                {draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}
              </p>
            </div>

            {geocodeLoading ? (
              <p className="text-sm font-medium text-zinc-700">
                Looking up address…
              </p>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="appt-address" className="text-sm font-medium text-zinc-900">
                Street address
              </label>
              <input
                id="appt-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={submitting}
                maxLength={addressMaxLength}
                placeholder="Street address"
                className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 disabled:bg-zinc-50"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="appt-suburb" className="sr-only">
                    Suburb
                  </label>
                  <input
                    id="appt-suburb"
                    type="text"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    disabled={submitting}
                    maxLength={suburbMaxLength}
                    placeholder="Suburb"
                    className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 disabled:bg-zinc-50"
                  />
                </div>
                <div>
                  <label htmlFor="appt-postcode" className="sr-only">
                    Postcode
                  </label>
                  <input
                    id="appt-postcode"
                    type="text"
                    inputMode="numeric"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    disabled={submitting}
                    maxLength={postcodeMaxLength}
                    placeholder="Postcode"
                    className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 disabled:bg-zinc-50"
                  />
                </div>
              </div>
            </div>

            {geocodeHint ? (
              <p className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
                {geocodeHint}
              </p>
            ) : null}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="min-h-11 flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep("details")}
                disabled={!canContinueAddress || submitting}
                className="min-h-11 flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              <p className="font-medium text-zinc-900">{address}</p>
              {(suburb || postcode) && (
                <p>
                  {[suburb, postcode].filter(Boolean).join(" ")}
                </p>
              )}
              <button
                type="button"
                onClick={() => setStep("address")}
                disabled={submitting}
                className="mt-1 text-xs font-semibold text-emerald-700 underline hover:text-emerald-800 disabled:opacity-60"
              >
                Change address
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="appt-customer-name" className="text-sm font-medium text-zinc-900">
                Customer name
              </label>
              <input
                id="appt-customer-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={submitting}
                maxLength={CUSTOMER_NAME_MAX_LENGTH}
                required
                autoComplete="name"
                placeholder="Full name"
                className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="appt-phone" className="text-sm font-medium text-zinc-900">
                Phone <span className="font-normal text-zinc-500">(optional)</span>
              </label>
              <input
                id="appt-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
                maxLength={PHONE_MAX_LENGTH}
                autoComplete="tel"
                placeholder="04xx xxx xxx"
                className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label htmlFor="appt-date" className="text-sm font-medium text-zinc-900">
                  Appointment date
                </label>
                <input
                  id="appt-date"
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  disabled={submitting}
                  required
                  className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="appt-time" className="text-sm font-medium text-zinc-900">
                  Time
                </label>
                <input
                  id="appt-time"
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  disabled={submitting}
                  required
                  className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="appt-closer" className="text-sm font-medium text-zinc-900">
                Closer name
              </label>
              <input
                id="appt-closer"
                type="text"
                value={closerName}
                onChange={(e) => setCloserName(e.target.value)}
                disabled={submitting}
                maxLength={CLOSER_NAME_MAX_LENGTH}
                required
                placeholder="Who is closing the deal?"
                className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="appt-notes" className="text-sm font-medium text-zinc-900">
                Additional notes <span className="font-normal text-zinc-500">(optional)</span>
              </label>
              <textarea
                id="appt-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                maxLength={NOTES_MAX_LENGTH}
                rows={3}
                placeholder="Gate code, best time to call back, etc."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep("address")}
                disabled={submitting}
                className="min-h-11 flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleBook();
                }}
                disabled={
                  submitting ||
                  !customerName.trim() ||
                  !appointmentDate ||
                  !appointmentTime ||
                  !closerName.trim()
                }
                className="min-h-11 flex-[1.4] rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Booking…" : "Book appointment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
