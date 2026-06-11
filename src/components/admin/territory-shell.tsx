"use client";

import { useCallback, useRef, useState } from "react";
import {
  TerritoryAssignmentsPanel,
  type TerritoryRep,
} from "@/components/admin/territory-assignments-panel";
import {
  TerritoryDrawTool,
  type TerritoryDrawToolHandle,
} from "@/components/admin/territory-draw-tool";
import { createTerritoryAssignment } from "@/features/territories/api";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import { useTerritories } from "@/features/territories/use-territories";
import {
  TERRITORY_NAME_MAX_LENGTH,
  TERRITORY_NOTES_MAX_LENGTH,
  type GeoJsonPolygon,
} from "@/lib/validators/territories";

type FormMode = "idle" | "create" | "edit";
type ShellView = "zones" | "assignments";

type TerritoryShellProps = {
  reps: TerritoryRep[];
};

function defaultAssignDate(): string {
  return formatSydneyDateString(new Date());
}

export function TerritoryShell({ reps }: TerritoryShellProps) {
  const { territories, loading, error, create, update, remove } =
    useTerritories();
  const [view, setView] = useState<ShellView>("zones");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("idle");
  const [drawEnabled, setDrawEnabled] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<GeoJsonPolygon | null>(
    null,
  );
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [assignRepId, setAssignRepId] = useState("");
  const [assignDate, setAssignDate] = useState(defaultAssignDate);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const drawToolRef = useRef<TerritoryDrawToolHandle>(null);

  const resetForm = useCallback(() => {
    setFormMode("idle");
    setDrawEnabled(false);
    setPendingPolygon(null);
    setName("");
    setNotes("");
    setAssignRepId("");
    setAssignDate(defaultAssignDate());
    setFormError(null);
  }, []);

  const switchView = useCallback(
    (nextView: ShellView) => {
      setView(nextView);
      if (nextView === "assignments") {
        resetForm();
      }
    },
    [resetForm],
  );

  const startDraw = useCallback(() => {
    setSelectedId(null);
    setFormMode("create");
    setDrawEnabled(true);
    setPendingPolygon(null);
    setName("");
    setNotes("");
    setAssignRepId("");
    setAssignDate(defaultAssignDate());
    setFormError(null);
  }, []);

  const selectTerritory = useCallback(
    (id: string) => {
      const territory = territories.find((item) => item.id === id);
      if (!territory && view === "zones") {
        return;
      }
      setSelectedId(id);
      if (view === "zones") {
        setFormMode("edit");
        setDrawEnabled(false);
        setPendingPolygon(null);
        setName(territory?.name ?? "");
        setNotes(territory?.notes ?? "");
        setAssignRepId("");
        setAssignDate(defaultAssignDate());
        setFormError(null);
      }
    },
    [territories, view],
  );

  const assignRepToTerritory = useCallback(
    async (territoryId: string) => {
      if (!assignRepId) {
        return { status: "skipped" as const };
      }

      const result = await createTerritoryAssignment({
        territory_id: territoryId,
        rep_id: assignRepId,
        assigned_date: assignDate,
      });

      if (result.status === "error") {
        return result;
      }

      return { status: "ok" as const, assignment: result.assignment };
    },
    [assignDate, assignRepId],
  );

  const handlePolygonDrawn = useCallback((polygon: GeoJsonPolygon) => {
    setPendingPolygon(polygon);
    setDrawEnabled(false);
    setFormMode("create");
    setFormError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setFormError(null);

    if (formMode === "create") {
      const polygon =
        pendingPolygon ?? drawToolRef.current?.getDrawnPolygon() ?? null;

      if (!polygon) {
        setFormError(
          "Draw a polygon on the map (click points, then double-click or click the first point to close), then save.",
        );
        return;
      }

      if (!pendingPolygon) {
        setPendingPolygon(polygon);
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        setFormError("Territory name is required.");
        return;
      }

      setSaving(true);
      const result = await create({
        name: trimmedName,
        notes: notes.trim() || null,
        polygon,
      });
      setSaving(false);

      if (result.status === "error") {
        setFormError(result.message);
        return;
      }

      const assignResult = await assignRepToTerritory(result.territory.id);
      if (assignResult.status === "error") {
        setSelectedId(result.territory.id);
        setFormMode("edit");
        setPendingPolygon(null);
        setDrawEnabled(false);
        setFormError(
          `Territory saved, but assignment failed: ${assignResult.message}`,
        );
        return;
      }

      setSelectedId(result.territory.id);
      setFormMode("edit");
      setPendingPolygon(null);
      setDrawEnabled(false);
      setAssignRepId("");
      return;
    }

    if (formMode === "edit" && selectedId) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setFormError("Territory name is required.");
        return;
      }

      setSaving(true);
      const result = await update(selectedId, {
        name: trimmedName,
        notes: notes.trim() || null,
      });
      setSaving(false);

      if (result.status === "error") {
        setFormError(result.message);
        return;
      }

      const assignResult = await assignRepToTerritory(selectedId);
      if (assignResult.status === "error") {
        setFormError(
          `Territory updated, but assignment failed: ${assignResult.message}`,
        );
        return;
      }

      setFormError(null);
      if (assignResult.status === "ok") {
        setAssignRepId("");
      }
    }
  }, [
    assignRepToTerritory,
    create,
    formMode,
    name,
    notes,
    pendingPolygon,
    selectedId,
    update,
  ]);

  const handleDelete = useCallback(async () => {
    if (!selectedId || formMode !== "edit") {
      return;
    }

    const territory = territories.find((item) => item.id === selectedId);
    const label = territory?.name ?? "this territory";

    if (
      !window.confirm(
        `Delete "${label}"? All dated assignments for this zone will be removed.`,
      )
    ) {
      return;
    }

    setFormError(null);
    setDeleting(true);
    const result = await remove(selectedId);
    setDeleting(false);

    if (result.status === "error") {
      setFormError(result.message);
      return;
    }

    resetForm();
    setSelectedId(null);
  }, [formMode, remove, resetForm, selectedId, territories]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-zinc-200 bg-white p-4 lg:min-h-0 lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Territories</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {view === "zones"
              ? "Draw zones, assign a rep, and add manager notes."
              : "Review and manage rep assignments by date."}
          </p>
        </div>

        <div className="flex rounded-lg border border-zinc-200 p-1">
          <button
            type="button"
            onClick={() => switchView("zones")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              view === "zones"
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Zones
          </button>
          <button
            type="button"
            onClick={() => switchView("assignments")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              view === "assignments"
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Assignments
          </button>
        </div>

        {view === "zones" ? (
          <>
            <button
              type="button"
              onClick={startDraw}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Draw new zone
            </button>

            {loading ? (
              <p className="text-sm text-zinc-600">Loading territories…</p>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                {error}
              </p>
            ) : null}

            {!loading && territories.length === 0 ? (
              <p className="text-sm text-zinc-500">No territories yet.</p>
            ) : null}

            <ul className="flex flex-col gap-2">
              {territories.map((territory) => (
                <li key={territory.id}>
                  <button
                    type="button"
                    onClick={() => selectTerritory(territory.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selectedId === territory.id
                        ? "border-amber-400 bg-amber-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <span className="block font-medium text-zinc-900">
                      {territory.name}
                    </span>
                    {territory.notes ? (
                      <span className="mt-1 block line-clamp-2 text-xs text-zinc-600">
                        {territory.notes}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>

            {formMode !== "idle" ? (
              <div className="space-y-3 border-t border-zinc-200 pt-4">
                <p className="text-sm font-medium text-zinc-900">
                  {formMode === "create" ? "Save new territory" : "Edit territory"}
                </p>

                {formMode === "create" ? (
                  <p
                    className={`text-sm ${
                      pendingPolygon ? "text-emerald-700" : "text-zinc-600"
                    }`}
                  >
                    {pendingPolygon
                      ? "Polygon captured — add a name and save."
                      : drawEnabled
                        ? "Click points on the map, then double-click or click the first point to close the shape."
                        : "Click Draw new zone, then draw on the map."}
                  </p>
                ) : null}

                <label className="block text-sm">
                  <span className="font-medium text-zinc-800">Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={TERRITORY_NAME_MAX_LENGTH}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                    placeholder="e.g. Surry Hills East"
                  />
                </label>

                <label className="block text-sm">
                  <span className="font-medium text-zinc-800">
                    Notes (optional)
                  </span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    maxLength={TERRITORY_NOTES_MAX_LENGTH}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                    placeholder="Manager context for this zone"
                  />
                </label>

                <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-sm font-medium text-zinc-900">
                    Assign rep to this zone
                  </p>

                  <label className="block text-sm">
                    <span className="font-medium text-zinc-800">Rep</span>
                    <select
                      value={assignRepId}
                      onChange={(event) => setAssignRepId(event.target.value)}
                      disabled={reps.length === 0}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
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
                    <span className="font-medium text-zinc-800">
                      Canvass date
                    </span>
                    <input
                      type="date"
                      value={assignDate}
                      onChange={(event) =>
                        setAssignDate(
                          event.target.value || defaultAssignDate(),
                        )
                      }
                      disabled={!assignRepId}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 disabled:opacity-60"
                    />
                  </label>

                  <p className="text-xs text-zinc-600">
                    {formMode === "create"
                      ? "Optional — assign when you save the new zone."
                      : "Optional — assign or re-assign when you save changes."}
                  </p>
                </div>

                {formError ? (
                  <p className="text-sm text-red-700">{formError}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || deleting}
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving || deleting}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  {formMode === "edit" ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={saving || deleting}
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {deleting ? "Deleting…" : "Delete zone"}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <TerritoryAssignmentsPanel
            reps={reps}
            territories={territories}
            territoriesLoading={loading}
            selectedTerritoryId={selectedId}
            onSelectTerritory={selectTerritory}
          />
        )}
      </aside>

      <div className="relative min-h-[420px] shrink-0 flex-1 lg:min-h-0 lg:shrink">
        <TerritoryDrawTool
          ref={drawToolRef}
          territories={territories}
          selectedId={selectedId}
          drawEnabled={view === "zones" && drawEnabled}
          pendingPolygon={pendingPolygon}
          onPolygonDrawn={handlePolygonDrawn}
        />
      </div>
    </div>
  );
}
