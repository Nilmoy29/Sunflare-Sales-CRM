"use client";

import { useState } from "react";
import { NOTES_MAX_LENGTH } from "@/lib/validators/knocks";

type LeadNoteComposeProps = {
  onSubmit: (content: string) => Promise<void>;
  serverError?: string | null;
};

export function LeadNoteCompose({ onSubmit, serverError }: LeadNoteComposeProps) {
  const [content, setContent] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed) {
      setClientError("Note cannot be empty");
      return;
    }

    setClientError(null);
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setContent("");
    } catch (e: unknown) {
      setClientError(
        e instanceof Error ? e.message : "Could not add note",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const displayError = clientError ?? serverError;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="lead-note" className="sr-only">
        Add a note
      </label>
      <textarea
        id="lead-note"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (clientError) {
            setClientError(null);
          }
        }}
        disabled={submitting}
        maxLength={NOTES_MAX_LENGTH}
        rows={3}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
        placeholder="Add a note for the team…"
      />
      {displayError ? (
        <p className="text-sm text-red-600" role="alert">
          {displayError}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          void handleSubmit();
        }}
        disabled={submitting}
        className="min-h-11 w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add note"}
      </button>
    </div>
  );
}
