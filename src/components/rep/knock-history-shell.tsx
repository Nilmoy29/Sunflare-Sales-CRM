"use client";

import Link from "next/link";
import { useState } from "react";
import { KnockEditSheet } from "@/components/rep/knock-edit-sheet";
import { deleteKnock } from "@/features/knocks/api";
import {
  formatKnockAddress,
  formatKnockHistoryDate,
} from "@/features/knocks/format-knock-date";
import { useKnockHistory } from "@/features/knocks/use-knock-history";
import {
  DOOR_OUTCOME_BUTTON_COLORS,
  DOOR_OUTCOME_LABELS,
} from "@/lib/geo/door-outcome-colors";
import { DOOR_OUTCOMES } from "@/lib/validators/enums";
import type { KnockHistoryItem } from "@/lib/validators/knocks";

const NOTES_PREVIEW_LENGTH = 80;

function truncateNotes(notes: string): string {
  if (notes.length <= NOTES_PREVIEW_LENGTH) {
    return notes;
  }
  return `${notes.slice(0, NOTES_PREVIEW_LENGTH).trimEnd()}…`;
}

export function KnockHistoryShell() {
  const {
    knocks,
    loading,
    error,
    truncated,
    filters,
    setFilters,
    loadMore,
    toggleOutcome,
    selectAllOutcomes,
    replaceKnock,
    removeKnock,
  } = useKnockHistory();

  const [editingKnock, setEditingKnock] = useState<KnockHistoryItem | null>(
    null,
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const allOutcomesSelected = filters.outcomes === null;

  async function handleDelete(knockId: string) {
    if (deletingId) {
      return;
    }

    setDeletingId(knockId);
    setActionError(null);

    const result = await deleteKnock(knockId);

    setDeletingId(null);
    setConfirmDeleteId(null);

    if (result.status === "error") {
      setActionError(result.message);
      return;
    }

    removeKnock(knockId);
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-white p-4 sm:gap-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Knock history</h1>
        <p className="mt-1 text-sm text-zinc-800">
          Review your past door knocks.{" "}
          <Link
            className="font-medium underline decoration-zinc-400 underline-offset-2 hover:text-zinc-950"
            href="/rep/map"
          >
            Back to map
          </Link>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="history-from" className="text-sm font-medium text-zinc-900">
            From
          </label>
          <input
            id="history-from"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ from: e.target.value })}
            className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="history-to" className="text-sm font-medium text-zinc-900">
            To
          </label>
          <input
            id="history-to"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ to: e.target.value })}
            className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-900">Outcome</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllOutcomes}
            className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold ring-2 ${
              allOutcomesSelected
                ? "bg-zinc-900 text-white ring-zinc-900"
                : "bg-white text-zinc-800 ring-zinc-300 hover:bg-zinc-50"
            }`}
            aria-pressed={allOutcomesSelected}
          >
            All
          </button>
          {DOOR_OUTCOMES.map((outcome) => {
            const selected =
              filters.outcomes !== null && filters.outcomes.includes(outcome);
            return (
              <button
                key={outcome}
                type="button"
                onClick={() => toggleOutcome(outcome)}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-white ring-2 ${
                  selected ? "ring-zinc-950" : "ring-zinc-300"
                }`}
                style={{ backgroundColor: DOOR_OUTCOME_BUTTON_COLORS[outcome] }}
                aria-pressed={selected}
              >
                {DOOR_OUTCOME_LABELS[outcome]}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
          {error}
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="alert">
          {actionError}
        </p>
      ) : null}

      {loading && knocks.length === 0 ? (
        <p className="text-sm font-medium text-zinc-700">Loading knocks…</p>
      ) : null}

      {!loading && knocks.length === 0 && !error ? (
        <p className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-800">
          No knocks in this range
        </p>
      ) : null}

      {knocks.length > 0 ? (
        <ul className="space-y-3">
          {knocks.map((knock) => (
            <li
              key={knock.id}
              className="rounded-lg border border-zinc-300 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                  style={{
                    backgroundColor: DOOR_OUTCOME_BUTTON_COLORS[knock.outcome],
                  }}
                >
                  {DOOR_OUTCOME_LABELS[knock.outcome]}
                </span>
                <span className="text-sm text-zinc-800">
                  {formatKnockHistoryDate(knock.knocked_at)}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-zinc-950">
                {formatKnockAddress(knock)}
              </p>
              {knock.notes ? (
                <p className="mt-1 text-sm text-zinc-800">
                  {truncateNotes(knock.notes)}
                </p>
              ) : null}
              {knock.has_linked_lead ? (
                <p className="mt-2 text-xs text-zinc-600">
                  Linked to pipeline lead
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setEditingKnock(knock);
                  }}
                  className="min-h-10 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  Edit
                </button>
                {knock.has_linked_lead ? (
                  <span className="self-center text-xs text-zinc-500">
                    Cannot delete while linked to a lead
                  </span>
                ) : confirmDeleteId === knock.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleDelete(knock.id)}
                      disabled={deletingId === knock.id}
                      className="min-h-10 rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                    >
                      {deletingId === knock.id ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deletingId === knock.id}
                      className="min-h-10 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setConfirmDeleteId(knock.id);
                    }}
                    className="min-h-10 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {truncated ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      ) : null}

      {editingKnock ? (
        <KnockEditSheet
          knock={editingKnock}
          onClose={() => setEditingKnock(null)}
          onSaved={(knock) => {
            replaceKnock(knock);
            setEditingKnock(null);
          }}
        />
      ) : null}
    </main>
  );
}
