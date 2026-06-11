"use client";

import { useState } from "react";
import { CallEditSheet } from "@/components/calls/call-edit-sheet";
import { deleteCall } from "@/features/calls/api";
import { formatKnockHistoryDate } from "@/features/knocks/format-knock-date";
import { CALL_OUTCOME_LABELS } from "@/lib/call-outcome-labels";
import { formatCallDurationMinutes } from "@/lib/validators/call-logs";
import type { ContactCallHistoryItem } from "@/lib/validators/lead-detail";

type ContactCallHistoryProps = {
  calls: ContactCallHistoryItem[];
  currentRepId: string | null;
  loading?: boolean;
  error?: string | null;
  onCallUpdated?: (call: ContactCallHistoryItem) => void;
  onCallDeleted?: (callId: string) => void;
};

function CallHistoryCard({
  call,
  canManage,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  confirmDelete,
  deleting,
}: {
  call: ContactCallHistoryItem;
  canManage: boolean;
  onEdit: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  confirmDelete: boolean;
  deleting: boolean;
}) {
  const duration = formatCallDurationMinutes(call.duration_seconds);
  const metaParts = [
    call.rep_name,
    formatKnockHistoryDate(call.called_at),
    duration,
  ].filter(Boolean);

  return (
    <li className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-zinc-900">
          {CALL_OUTCOME_LABELS[call.outcome]}
        </p>
        <p className="text-xs text-zinc-500">{metaParts.join(" · ")}</p>
      </div>
      {call.notes ? (
        <p className="mt-2 text-sm text-zinc-700">{call.notes}</p>
      ) : null}
      {canManage ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-9 rounded-lg border border-zinc-300 px-3 py-1 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Edit
          </button>
          {call.has_linked_lead ? (
            <span className="self-center text-xs text-zinc-500">
              Cannot delete while linked to a lead
            </span>
          ) : confirmDelete ? (
            <>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={deleting}
                className="min-h-9 rounded-lg bg-red-700 px-3 py-1 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                disabled={deleting}
                className="min-h-9 rounded-lg border border-zinc-300 px-3 py-1 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onRequestDelete}
              className="min-h-9 rounded-lg border border-red-300 px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function ContactCallHistory({
  calls,
  currentRepId,
  loading = false,
  error = null,
  onCallUpdated,
  onCallDeleted,
}: ContactCallHistoryProps) {
  const [editingCall, setEditingCall] = useState<ContactCallHistoryItem | null>(
    null,
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete(callId: string) {
    if (deletingId) {
      return;
    }

    setDeletingId(callId);
    setActionError(null);

    const result = await deleteCall(callId);

    setDeletingId(null);
    setConfirmDeleteId(null);

    if (result.status === "error") {
      setActionError(result.message);
      return;
    }

    onCallDeleted?.(callId);
  }

  return (
    <section className="mt-6 flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-zinc-900">Call history</h3>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading call history…</p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {actionError ? (
        <p className="text-sm text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}

      {!loading && !error && calls.length === 0 ? (
        <p className="text-sm text-zinc-500">No calls logged yet.</p>
      ) : null}

      {!loading && !error && calls.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {calls.map((call) => (
            <CallHistoryCard
              key={call.id}
              call={call}
              canManage={currentRepId !== null && call.rep_id === currentRepId}
              onEdit={() => {
                setActionError(null);
                setEditingCall(call);
              }}
              onRequestDelete={() => {
                setActionError(null);
                setConfirmDeleteId(call.id);
              }}
              onConfirmDelete={() => void handleDelete(call.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              confirmDelete={confirmDeleteId === call.id}
              deleting={deletingId === call.id}
            />
          ))}
        </ul>
      ) : null}

      {editingCall ? (
        <CallEditSheet
          call={editingCall}
          onClose={() => setEditingCall(null)}
          onSaved={(call) => {
            onCallUpdated?.(call);
            setEditingCall(null);
          }}
        />
      ) : null}
    </section>
  );
}
