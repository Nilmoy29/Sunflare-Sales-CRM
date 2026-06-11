import { CallsPanelShell } from "@/components/calls/calls-panel-shell";
import { requireRole } from "@/lib/auth/session";

export default async function RepCallsPage() {
  const profile = await requireRole(["rep"]);

  return <CallsPanelShell currentRepId={profile.id} />;
}
