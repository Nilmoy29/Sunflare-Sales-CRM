import { ProfileForm } from "@/features/auth/components/profile-form";
import { requireRole } from "@/lib/auth/session";

export default async function RepProfilePage() {
  const profile = await requireRole(["rep"]);

  return (
    <main className="flex flex-1 flex-col gap-6 bg-white p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">My profile</h1>
        <p className="mt-1 text-sm text-zinc-800">
          View your assigned details. You can edit only your name and phone.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </main>
  );
}
