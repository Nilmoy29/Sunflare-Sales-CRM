import { LeadDetailShell } from "@/components/pipeline/lead-detail-shell";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ leadId: string }>;
};

export default async function AdminLeadDetailPage({ params }: PageProps) {
  await requireRole(["admin"]);
  const { leadId } = await params;

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
      <LeadDetailShell
        leadId={leadId}
        backHref="/admin/pipeline"
        backLabel="Back to pipeline"
        layout="desktop"
        showReassign
        showDelete
        reps={reps}
      />
    </div>
  );
}
