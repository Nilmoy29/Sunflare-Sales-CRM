import { notFound } from "next/navigation";
import { RepDeepDiveShell } from "@/components/admin/rep-deep-dive-shell";
import { getRepList, getRepProfile } from "@/features/admin/get-rep-profile";
import { requireRole } from "@/lib/auth/session";
import { repIdParamSchema } from "@/lib/validators/rep-deep-dive";

type RepDeepDivePageProps = {
  params: Promise<{ repId: string }>;
};

export default async function RepDeepDivePage({ params }: RepDeepDivePageProps) {
  await requireRole(["admin"]);

  const { repId } = await params;
  const parsedRepId = repIdParamSchema.safeParse(repId);
  if (!parsedRepId.success) {
    notFound();
  }

  const [rep, reps] = await Promise.all([
    getRepProfile(parsedRepId.data),
    getRepList(),
  ]);

  if (!rep) {
    notFound();
  }

  return <RepDeepDiveShell rep={rep} reps={reps} />;
}
