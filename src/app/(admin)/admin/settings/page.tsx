import { CallScriptSettingsForm } from "@/components/admin/call-script-settings-form";
import { requireRole } from "@/lib/auth/session";

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage team configuration.
        </p>
      </div>
      <CallScriptSettingsForm />
    </main>
  );
}
