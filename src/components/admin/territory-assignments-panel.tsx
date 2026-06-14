"use client";

import { useCallback, useState } from "react";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import { useTerritoryAssignments } from "@/features/territories/use-territory-assignments";
import type { TerritorySummary } from "@/lib/validators/territories";

export type TerritoryRep = {
  id: string;
  name: string;
};

type TerritoryAssignmentsPanelProps = {
  reps: TerritoryRep[];
  territories: TerritorySummary[];
  territoriesLoading: boolean;
  selectedTerritoryId: string | null;
  onSelectTerritory: (territoryId: string) => void;
};

export function TerritoryAssignmentsPanel({
  reps,
  territories,
  territoriesLoading,
  selectedTerritoryId,
  onSelectTerritory,
}: TerritoryAssignmentsPanelProps) {
  const [filterDate, setFilterDate] = useState(() =>
    formatSydneyDateString(new Date()),
  );
  const [territoryId, setTerritoryId] = useState("");
  const [repId, setRepId] = useState("");
  const [assignDate, setAssignDate] = useState(() =>
    formatSydneyDateString(new Date()),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { assignments, loading, error, create } = useTerritoryAssignments({
    assignedDate: filterDate,
  });

  const handleAssign = useCallback(async () => {
    setFormError(null);

    if (!territoryId) {
      setFormError("Select a territory.");
      return;
    }

    if (!repId) {
      setFormError("Select a rep.");
      return;
    }

    if (!assignDate) {
      setFormError("Assignment date is required.");
      return;
    }

    setSaving(true);
    const result = await create({
      territory_id: territoryId,
      rep_id: repId,
      assigned_date: assignDate,
    });
    setSaving(false);

    if (result.status === "error") {
      setFormError(result.message);
      return;
    }

    onSelectTerritory(result.assignment.territory_id);
    if (result.assignment.assigned_date !== filterDate) {
      setFilterDate(result.assignment.assigned_date);
    }
  }, [
    assignDate,
    create,
    filterDate,
    onSelectTerritory,
    repId,
    territoryId,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <label className="block text-sm">
        <span className="font-medium text-foreground">Filter by date</span>
        <input
          type="date"
          value={filterDate}
          onChange={(event) =>
            setFilterDate(
              event.target.value || formatSydneyDateString(new Date()),
            )
          }
          className="mt-1 w-full rounded-lg border border-border px-3 py-2"
        />
      </label>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading assignments…</p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          {error}
        </p>
      ) : null}

      {!loading && assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assignments for this date.</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {assignments.map((assignment) => (
          <li key={assignment.id}>
            <button
              type="button"
              onClick={() => onSelectTerritory(assignment.territory_id)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                selectedTerritoryId === assignment.territory_id
                  ? "border-amber-400 bg-amber-50"
                  : "border-border bg-card hover:border-border"
              }`}
            >
              <span className="block font-medium text-foreground">
                {assignment.rep_name}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {assignment.territory_name} · {assignment.assigned_date}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground">Assign territory</p>

        <label className="block text-sm">
          <span className="font-medium text-foreground">Territory</span>
          <select
            value={territoryId}
            onChange={(event) => setTerritoryId(event.target.value)}
            disabled={territoriesLoading || territories.length === 0}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          >
            <option value="">Select territory…</option>
            {territories.map((territory) => (
              <option key={territory.id} value={territory.id}>
                {territory.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-foreground">Rep</span>
          <select
            value={repId}
            onChange={(event) => setRepId(event.target.value)}
            disabled={reps.length === 0}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          >
            <option value="">Select rep…</option>
            {reps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-foreground">Date</span>
          <input
            type="date"
            value={assignDate}
            onChange={(event) => setAssignDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
        </label>

        {formError ? (
          <p className="text-sm text-red-700">{formError}</p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleAssign()}
          disabled={saving || territories.length === 0 || reps.length === 0}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
        >
          {saving ? "Assigning…" : "Assign"}
        </button>
      </div>
    </div>
  );
}
