import { PipelineBoardShell } from "@/components/pipeline/pipeline-board-shell";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPipelinePage() {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,name")
    .eq("role", "rep")
    .order("name", { ascending: true });

  const reps = ((data ?? []) as { id: string; name: string }[]).map((rep) => ({
    id: rep.id,
    name: rep.name,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PipelineBoardShell
        title="Pipeline"
        description="View all reps' leads and move them through the sales process."
        showRepName
        showOwnerFilter
        detailBasePath="/admin/pipeline"
        reps={reps}
        layout="desktop"
      />
    </div>
  );
}
