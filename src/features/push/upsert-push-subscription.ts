import { createClient } from "@/lib/supabase/server";
import type { PushSubscribeBody } from "@/lib/validators/push";

export async function upsertPushSubscription(
  repId: string,
  body: PushSubscribeBody,
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      rep_id: repId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    } as never,
    { onConflict: "endpoint" },
  );

  if (error) {
    if (error.code === "42501") {
      return false;
    }
    throw error;
  }

  return true;
}

export async function deletePushSubscription(
  repId: string,
  endpoint: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("rep_id", repId)
    .eq("endpoint", endpoint)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return false;
    }
    throw error;
  }

  return Boolean(data);
}
