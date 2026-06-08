import { RepHeader } from "@/components/rep/rep-header";
import { getAuthProfile } from "@/lib/auth/session";

export default async function RepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getAuthProfile();

  return (
    <div className="rep-theme flex h-dvh flex-col overflow-hidden bg-white text-zinc-950">
      <RepHeader name={profile?.name ?? "Field rep"} />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
