"use client";

import { useCallback, useState } from "react";
import {
  TerritoryAssignmentsPanel,
  type TerritoryRep,
} from "@/components/admin/territory-assignments-panel";
import { TerritoryDrawTool } from "@/components/admin/territory-draw-tool";
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

export function TerritoryShell({ reps }: TerritoryShellProps) {
  const { territories, loading, error, create, update } = useTerritories();
  const [view, setView] = useState<ShellView>("zones");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("idle");
  const [drawEnabled, setDrawEnabled] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<GeoJsonPolygon | null>(
    null,
  );
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setFormMode("idle");
    setDrawEnabled(false);
    setPendingPolygon(null);
    setName("");
    setNotes("");
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
        setFormError(null);
      }
    },
    [territories, view],
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
      if (!pendingPolygon) {
        setFormError("Draw a polygon on the map before saving.");
        return;
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
        polygon: pendingPolygon,
      });
      setSaving(false);

      if (result.status === "error") {
        setFormError(result.message);
        return;
      }

      setSelectedId(result.territory.id);
      setFormMode("edit");
      setPendingPolygon(null);
      setDrawEnabled(false);
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

      setFormError(null);
    }
  }, [
    create,
    formMode,
    name,
    notes,
    pendingPolygon,
    selectedId,
    update,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-zinc-200 bg-white p-4 lg:w-80 lg:border-b-0 lg:border-r">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Territories</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {view === "zones"
              ? "Draw canvassing zones and add manager notes."
              : "Assign zones to reps by date."}
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

            <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto lg:max-h-none lg:flex-1">
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

                {formMode === "create" && !pendingPolygon ? (
                  <p className="text-sm text-zinc-600">
                    {drawEnabled
                      ? "Click polygon points on the map, then double-click to finish."
                      : "Use the map draw control or click Draw new zone."}
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

                {formError ? (
                  <p className="text-sm text-red-700">{formError}</p>
                ) : null}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
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

      <TerritoryDrawTool
        territories={territories}
        selectedId={selectedId}
        drawEnabled={view === "zones" && drawEnabled}
        onPolygonDrawn={handlePolygonDrawn}
      />
    </div>
  );
}
