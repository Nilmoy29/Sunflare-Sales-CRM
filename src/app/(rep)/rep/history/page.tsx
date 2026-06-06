import { KnockHistoryShell } from "@/components/rep/knock-history-shell";
import { requireRole } from "@/lib/auth/session";

export default async function RepHistoryPage() {
  await requireRole(["rep"]);

  return <KnockHistoryShell />;
}
