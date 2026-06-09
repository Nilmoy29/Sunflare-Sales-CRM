import { AdminHeader } from "@/components/admin/admin-header";
import { getAuthProfile } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getAuthProfile();

  return (
    <div className="admin-theme flex min-h-full flex-1 flex-col bg-white text-zinc-950">
      <AdminHeader name={profile?.name ?? "Manager"} />
      {children}
    </div>
  );
}
