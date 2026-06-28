"use client";

import { useMemo, useState } from "react";
import { PipelineFiltersBar, type PipelineFilterRep } from "@/components/pipeline/pipeline-filters";
import { PipelineTable } from "@/components/pipeline/pipeline-table";
import {
  PipelineViewToggle,
  type PipelineListView,
} from "@/components/pipeline/pipeline-view-toggle";
import { defaultPipelineFilters } from "@/features/pipeline/default-pipeline-filters";
import { filterOverdueFollowUpLeads } from "@/features/pipeline/latest-update-display";
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
  const [listView, setListView] = useState<PipelineListView>("bookings");
  const { leads, loading, error, moveLeadStage, removeLead, saveLeadFollowUp, completeLeadFollowUp } =
    usePipelineLeads(filters);

  const overdueCount = useMemo(
    () => filterOverdueFollowUpLeads(leads).length,
    [leads],
  );

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

      <PipelineViewToggle
        view={listView}
        overdueCount={overdueCount}
        onChange={setListView}
      />

      <PipelineTable
        leads={leads}
        loading={loading}
        error={error}
        listView={listView}
        showRepName={showRepName}
        detailBasePath={detailBasePath}
        onStageChange={moveLeadStage}
        onSaveFollowUp={saveLeadFollowUp}
        onCompleteFollowUp={completeLeadFollowUp}
        allowDelete={allowDelete}
        onDeleteLead={allowDelete ? removeLead : undefined}
      />
    </main>
  );
}
