import { AdminMapShell } from "@/components/admin/admin-map-shell";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMapPage() {
  await requireRole(["admin"]);

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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
      <AdminMapShell reps={reps} />
    </div>
  );
}
