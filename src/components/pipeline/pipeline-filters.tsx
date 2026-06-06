"use client";

import { useCallback, useState } from "react";
import {
  LEAD_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
} from "@/features/pipeline/pipeline-stage-labels";
import { LEAD_SOURCE_LABELS } from "@/features/pipeline/pipeline-source-labels";
import { LEAD_SOURCES, type LeadSource, type LeadStage } from "@/lib/validators/enums";
import type { PipelineFilters } from "@/lib/validators/pipeline";

export type PipelineFilterRep = {
  id: string;
  name: string;
};

type PipelineFiltersProps = {
  filters: PipelineFilters;
  onChange: (filters: PipelineFilters) => void;
  showOwnerFilter: boolean;
  reps?: PipelineFilterRep[];
};

export function PipelineFiltersBar({
  filters,
  onChange,
  showOwnerFilter,
  reps = [],
}: PipelineFiltersProps) {
  const allStagesSelected = filters.stages === null;
  const allSourcesSelected = filters.sources === null;
  const allRepsSelected = filters.repIds === null;

  const sortedReps = [...reps].sort((a, b) => a.name.localeCompare(b.name));
  const [suburbDraft, setSuburbDraft] = useState(filters.suburb);

  const selectAllStages = useCallback(() => {
    onChange({ ...filters, stages: null });
  }, [filters, onChange]);

  const toggleStage = useCallback(
    (stage: LeadStage) => {
      onChange({
        ...filters,
        stages: (() => {
          if (filters.stages === null) {
            return [stage];
          }
          const next = filters.stages.includes(stage)
            ? filters.stages.filter((value) => value !== stage)
            : [...filters.stages, stage];
          return next.length === 0 ? null : next;
        })(),
      });
    },
    [filters, onChange],
  );

  const selectAllSources = useCallback(() => {
    onChange({ ...filters, sources: null });
  }, [filters, onChange]);

  const toggleSource = useCallback(
    (source: LeadSource) => {
      onChange({
        ...filters,
        sources: (() => {
          if (filters.sources === null) {
            return [source];
          }
          const next = filters.sources.includes(source)
            ? filters.sources.filter((value) => value !== source)
            : [...filters.sources, source];
          return next.length === 0 ? null : next;
        })(),
      });
    },
    [filters, onChange],
  );

  const selectAllReps = useCallback(() => {
    onChange({ ...filters, repIds: null });
  }, [filters, onChange]);

  const toggleRep = useCallback(
    (repId: string) => {
      onChange({
        ...filters,
        repIds: (() => {
          if (filters.repIds === null) {
            return [repId];
          }
          const next = filters.repIds.includes(repId)
            ? filters.repIds.filter((id) => id !== repId)
            : [...filters.repIds, repId];
          return next.length === 0 ? null : next;
        })(),
      });
    },
    [filters, onChange],
  );

  const updateDate = useCallback(
    (field: "from" | "to", value: string) => {
      onChange({ ...filters, [field]: value });
    },
    [filters, onChange],
  );

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <label
            htmlFor="pipeline-suburb"
            className="text-sm font-medium text-zinc-900"
          >
            Suburb
          </label>
          <input
            id="pipeline-suburb"
            type="text"
            value={suburbDraft}
            onChange={(e) => setSuburbDraft(e.target.value)}
            onBlur={() =>
              onChange({ ...filters, suburb: suburbDraft.trim() })
            }
            placeholder="Filter by suburb"
            className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="pipeline-from" className="text-sm font-medium text-zinc-900">
            From
          </label>
          <input
            id="pipeline-from"
            type="date"
            value={filters.from}
            onChange={(e) => updateDate("from", e.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="pipeline-to" className="text-sm font-medium text-zinc-900">
            To
          </label>
          <input
            id="pipeline-to"
            type="date"
            value={filters.to}
            onChange={(e) => updateDate("to", e.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-900">Stage</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllStages}
            className={`min-h-10 rounded-lg px-3 py-1.5 text-sm font-semibold ring-2 ${
              allStagesSelected
                ? "bg-zinc-900 text-white ring-zinc-900"
                : "bg-white text-zinc-700 ring-zinc-200"
            }`}
          >
            All stages
          </button>
          {PIPELINE_STAGE_ORDER.map((stage) => {
            const selected =
              !allStagesSelected &&
              filters.stages !== null &&
              filters.stages.includes(stage);
            return (
              <button
                key={stage}
                type="button"
                onClick={() => toggleStage(stage)}
                className={`min-h-10 rounded-lg px-3 py-1.5 text-sm font-semibold ring-2 ${
                  selected
                    ? "bg-zinc-900 text-white ring-zinc-900"
                    : "bg-white text-zinc-700 ring-zinc-200"
                }`}
              >
                {LEAD_STAGE_LABELS[stage]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-900">Channel</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllSources}
            className={`min-h-10 rounded-lg px-3 py-1.5 text-sm font-semibold ring-2 ${
              allSourcesSelected
                ? "bg-zinc-900 text-white ring-zinc-900"
                : "bg-white text-zinc-700 ring-zinc-200"
            }`}
          >
            All channels
          </button>
          {LEAD_SOURCES.map((source) => {
            const selected =
              !allSourcesSelected &&
              filters.sources !== null &&
              filters.sources.includes(source);
            return (
              <button
                key={source}
                type="button"
                onClick={() => toggleSource(source)}
                className={`min-h-10 rounded-lg px-3 py-1.5 text-sm font-semibold ring-2 ${
                  selected
                    ? "bg-zinc-900 text-white ring-zinc-900"
                    : "bg-white text-zinc-700 ring-zinc-200"
                }`}
              >
                {LEAD_SOURCE_LABELS[source]}
              </button>
            );
          })}
        </div>
      </div>

      {showOwnerFilter ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-900">Owner</p>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allRepsSelected}
                onChange={selectAllReps}
                className="size-4 rounded border-zinc-300"
              />
              <span className="font-medium">All reps</span>
            </label>
            {sortedReps.map((rep) => {
              const checked =
                !allRepsSelected &&
                filters.repIds !== null &&
                filters.repIds.includes(rep.id);
              return (
                <label
                  key={rep.id}
                  className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRep(rep.id)}
                    className="size-4 rounded border-zinc-300"
                  />
                  <span>{rep.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
