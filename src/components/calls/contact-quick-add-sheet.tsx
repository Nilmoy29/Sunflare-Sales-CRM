"use client";

import { useState } from "react";
import { createContact } from "@/features/calls/api";
import type { ContactSummary } from "@/lib/validators/contacts";

type ContactQuickAddSheetProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (contact: ContactSummary) => void;
  onDuplicate: (contact: ContactSummary) => void;
};

export function ContactQuickAddSheet({
  open,
  onClose,
  onCreated,
  onDuplicate,
}: ContactQuickAddSheetProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createContact({
      first_name: firstName,
      last_name: lastName,
      phone,
      address: address.trim() || null,
      suburb: suburb.trim() || null,
    });

    setSubmitting(false);

    if (result.status === "ok") {
      onCreated(result.contact);
      setFirstName("");
      setLastName("");
      setPhone("");
      setAddress("");
      setSuburb("");
      onClose();
      return;
    }

    if (result.status === "duplicate") {
      onDuplicate(result.contact);
      onClose();
      return;
    }

    setError(result.message);
  }

  return (
    <div className="fixed inset-0 z-20">
      <button
        type="button"
        aria-label="Close quick add"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <form
        role="dialog"
        aria-labelledby="contact-quick-add-title"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 sheet-bottom shadow-xl ring-1 ring-zinc-200"
        onSubmit={handleSubmit}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="contact-quick-add-title"
            className="text-lg font-semibold text-zinc-900"
          >
            Quick add contact
          </h2>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-lg px-3 text-sm text-zinc-600 hover:bg-zinc-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-zinc-700">
            First name
            <input
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-base"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Last name
            <input
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-base"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Phone
            <input
              required
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-base"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Address (optional)
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-base"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Suburb (optional)
            <input
              value={suburb}
              onChange={(event) => setSuburb(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-base"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 min-h-11 w-full rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save contact"}
        </button>
      </form>
    </div>
  );
}
