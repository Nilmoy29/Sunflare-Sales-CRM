import { LeadDetailShell } from "@/components/pipeline/lead-detail-shell";
import { requireRole } from "@/lib/auth/session";

type PageProps = {
  params: Promise<{ leadId: string }>;
};

export default async function RepLeadDetailPage({ params }: PageProps) {
  await requireRole(["rep"]);
  const { leadId } = await params;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <LeadDetailShell
        leadId={leadId}
        backHref="/rep/pipeline"
        backLabel="Back to pipeline"
        layout="mobile"
        showPushPrompt
      />
    </div>
  );
}
