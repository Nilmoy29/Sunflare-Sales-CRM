import { LeadDetailShell } from "@/components/pipeline/lead-detail-shell";
import { requireRole } from "@/lib/auth/session";

type PageProps = {
  params: Promise<{ leadId: string }>;
};

export default async function RepLeadDetailPage({ params }: PageProps) {
  await requireRole(["rep"]);
  const { leadId } = await params;

  return (
    <LeadDetailShell
      leadId={leadId}
      backHref="/rep/pipeline"
      backLabel="Back to pipeline"
      layout="mobile"
      showPushPrompt
    />
  );
}
