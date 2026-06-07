"use client";

import { useState } from "react";
import { formatKnockHistoryDate } from "@/features/knocks/format-knock-date";
import { useAdminCallScript } from "@/features/calls/use-admin-call-script";
import { CALL_SCRIPT_BODY_MAX_LENGTH } from "@/lib/validators/call-script";

export function CallScriptSettingsForm() {
  const {
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
  } = useAdminCallScript();
  const [showSaved, setShowSaved] = useState(false);

  const nearLimit = body.length > CALL_SCRIPT_BODY_MAX_LENGTH * 0.9;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setShowSaved(false);

    try {
      await save(body);
      setShowSaved(true);
    } catch {
      // saveError is set in the hook
    }
  }

  if (loading) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-100" />
        <div className="mt-4 h-40 animate-pulse rounded-lg bg-zinc-100" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 ring-1 ring-zinc-200">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Call script</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Reps see this text in the collapsible script widget on the calls panel.
          Plain text only — line breaks are preserved.
        </p>
        {updatedAt ? (
          <p className="mt-2 text-xs text-zinc-500">
            Last updated {formatKnockHistoryDate(updatedAt)}
          </p>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <label className="sr-only" htmlFor="call-script-body">
          Call script body
        </label>
        <textarea
          id="call-script-body"
          value={body}
          onChange={(event) => {
            setShowSaved(false);
            setBody(event.target.value);
          }}
          rows={12}
          maxLength={CALL_SCRIPT_BODY_MAX_LENGTH}
          className="min-h-48 w-full resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
          placeholder="Enter the call script reps should follow…"
        />

        {nearLimit ? (
          <p className="text-xs text-zinc-500">
            {body.length.toLocaleString()} /{" "}
            {CALL_SCRIPT_BODY_MAX_LENGTH.toLocaleString()} characters
          </p>
        ) : null}

        {saveError ? (
          <p className="text-sm text-red-600" role="alert">
            {saveError}
          </p>
        ) : null}

        {showSaved && lastSavedAt ? (
          <p className="text-sm text-emerald-700" role="status">
            Call script saved. Reps will see changes after reloading the calls
            panel.
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={saving || !dirty}
            className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}
