import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { requireRole } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  await requireRole(["admin"]);

  return <AdminDashboardShell />;
}
