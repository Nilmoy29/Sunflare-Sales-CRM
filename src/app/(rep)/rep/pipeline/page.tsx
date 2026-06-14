import { PipelineBoardShell } from "@/components/pipeline/pipeline-board-shell";
import { requireRole } from "@/lib/auth/session";

export default async function RepPipelinePage() {
  await requireRole(["rep"]);

  return (
    <PipelineBoardShell
      title="Pipeline"
      description="Track your leads, update status, and add notes from one sheet."
      showRepName={false}
      showOwnerFilter={false}
      detailBasePath="/rep/pipeline"
      layout="mobile"
    />
  );
}
