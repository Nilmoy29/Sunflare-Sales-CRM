import { CallsPanelShell } from "@/components/calls/calls-panel-shell";
import { requireRole } from "@/lib/auth/session";

export default async function RepCallsPage() {
  await requireRole(["rep"]);

  return <CallsPanelShell />;
}
