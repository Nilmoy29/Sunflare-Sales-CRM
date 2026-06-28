"use client";

import { getLatestUpdateDisplay } from "@/features/pipeline/latest-update-display";
import { formatPipelineDate } from "@/features/pipeline/format-pipeline-dates";
import type { PipelineLeadCard } from "@/lib/validators/pipeline";

type PipelineLatestUpdateCellProps = {
  lead: PipelineLeadCard;
};

export function PipelineLatestUpdateCell({ lead }: PipelineLatestUpdateCellProps) {
  const update = getLatestUpdateDisplay(lead);

  if (update.text === "—") {
    return <p className="text-xs text-muted-foreground/70">No updates yet</p>;
  }

  return (
    <div className="min-w-[10rem] max-w-[16rem]">
      {update.date ? (
        <p className="text-xs font-medium text-muted-foreground">
          {formatPipelineDate(update.date)}
        </p>
      ) : null}
      <p className="mt-0.5 line-clamp-3 text-xs text-foreground" title={update.text}>
        {update.text}
      </p>
    </div>
  );
}
