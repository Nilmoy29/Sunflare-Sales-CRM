import { TerritoryShell } from "@/components/admin/territory-shell";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminTerritoriesPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,name")
    .eq("role", "rep")
    .eq("active", true)
    .order("name", { ascending: true });

  const reps = ((data ?? []) as { id: string; name: string }[]).map((rep) => ({
    id: rep.id,
    name: rep.name,
  }));

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
      <TerritoryShell reps={reps} />
    </main>
  );
}
