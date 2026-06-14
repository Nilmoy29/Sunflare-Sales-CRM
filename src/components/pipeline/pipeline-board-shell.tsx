"use client";

import { useState } from "react";
import { PipelineFiltersBar, type PipelineFilterRep } from "@/components/pipeline/pipeline-filters";
import { PipelineTable } from "@/components/pipeline/pipeline-table";
import { defaultPipelineFilters } from "@/features/pipeline/default-pipeline-filters";
import { usePipelineLeads } from "@/features/pipeline/use-pipeline-leads";
import type { PipelineFilters } from "@/lib/validators/pipeline";

type PipelineBoardShellProps = {
  title: string;
  description: string;
  showRepName: boolean;
  showOwnerFilter: boolean;
  detailBasePath: string;
  reps?: PipelineFilterRep[];
  layout?: "mobile" | "desktop";
  allowDelete?: boolean;
};

export function PipelineBoardShell({
  title,
  description,
  showRepName,
  showOwnerFilter,
  detailBasePath,
  reps = [],
  layout = "mobile",
  allowDelete = false,
}: PipelineBoardShellProps) {
  const [filters, setFilters] = useState<PipelineFilters>(defaultPipelineFilters);
  const { leads, loading, error, moveLeadStage, removeLead, addLeadNote } =
    usePipelineLeads(filters);

  return (
    <main
      className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-background p-4 sm:gap-6 ${
        layout === "desktop" ? "md:p-8" : "md:p-6"
      }`}
    >
      <div>
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <PipelineFiltersBar
        filters={filters}
        onChange={setFilters}
        showOwnerFilter={showOwnerFilter}
        reps={reps}
      />

      <PipelineTable
        leads={leads}
        loading={loading}
        error={error}
        showRepName={showRepName}
        detailBasePath={detailBasePath}
        onStageChange={moveLeadStage}
        onAddNote={addLeadNote}
        allowDelete={allowDelete}
        onDeleteLead={allowDelete ? removeLead : undefined}
      />
    </main>
  );
}
