"use client";

import Link from "next/link";
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
  } = useKnockHistory();

  const allOutcomesSelected = filters.outcomes === null;

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-white p-4 sm:gap-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Knock history</h1>
        <p className="mt-1 text-sm text-zinc-800">
          Review your past door knocks.{" "}
          <Link className="font-medium underline decoration-zinc-400 underline-offset-2 hover:text-zinc-950" href="/rep/map">
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
    </main>
  );
}
