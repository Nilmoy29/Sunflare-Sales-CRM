import { TeamManagement } from "@/features/admin/components/team-management";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type TeamMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  start_date: string | null;
  created_at: string;
};

export default async function AdminTeamPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,name,phone,active,start_date,created_at")
    .eq("role", "rep")
    .order("created_at", { ascending: false });

  const adminClient = createAdminClient();
  const { data: usersData } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emailById = new Map(
    (usersData?.users ?? []).map((user) => [user.id, user.email ?? null]),
  );

  const reps: TeamMember[] = ((data ?? []) as Omit<TeamMember, "email">[]).map((rep) => ({
    ...rep,
    email: emailById.get(rep.id) ?? null,
  }));

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and invite reps, activate/deactivate access, and trigger password reset emails.
        </p>
      </div>
      <TeamManagement reps={reps} />
    </main>
  );
}
