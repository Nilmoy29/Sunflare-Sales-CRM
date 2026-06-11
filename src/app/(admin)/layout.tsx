import { AdminHeader } from "@/components/admin/admin-header";
import { getAuthProfile } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getAuthProfile();

  return (
    <div className="admin-theme flex h-dvh flex-col overflow-hidden bg-white text-zinc-950">
      <AdminHeader name={profile?.name ?? "Manager"} />
      {children}
    </div>
  );
}
