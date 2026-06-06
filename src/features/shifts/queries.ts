import { createClient } from "@/lib/supabase/server";
import type { ShiftSummary } from "@/lib/validators/shifts";

export async function getActiveShiftForRep(
  repId: string,
): Promise<ShiftSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("id, started_at, ended_at")
    .eq("rep_id", repId)
    .is("ended_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ShiftSummary;
}
