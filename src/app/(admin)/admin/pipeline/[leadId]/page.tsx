import { LeadDetailShell } from "@/components/pipeline/lead-detail-shell";
import { requireRole } from "@/lib/auth/session";

type PageProps = {
  params: Promise<{ leadId: string }>;
};

export default async function AdminLeadDetailPage({ params }: PageProps) {
  await requireRole(["admin"]);
  const { leadId } = await params;

  return (
    <LeadDetailShell
      leadId={leadId}
      backHref="/admin/pipeline"
      backLabel="Back to pipeline"
      layout="desktop"
    />
  );
}
