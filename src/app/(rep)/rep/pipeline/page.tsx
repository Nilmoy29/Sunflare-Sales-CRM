import { PipelineBoardShell } from "@/components/pipeline/pipeline-board-shell";
import { requireRole } from "@/lib/auth/session";

export default async function RepPipelinePage() {
  await requireRole(["rep"]);

  return (
    <PipelineBoardShell
      title="Pipeline"
      description="Drag leads between stages to update your pipeline."
      showRepName={false}
      showOwnerFilter={false}
      detailBasePath="/rep/pipeline"
      layout="mobile"
    />
  );
}
