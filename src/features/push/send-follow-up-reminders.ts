import { createAdminClient } from "@/lib/supabase/admin";
import { formatContactDisplayName } from "@/features/pipeline/pipeline-stage-labels";
import { sendExpoPushNotification } from "@/features/push/send-expo-push";
import { ensureVapidConfigured, webpush } from "@/features/push/vapid-config";
import type { FollowUpRemindersCronResponse } from "@/lib/validators/push";

type DueFollowUpRow = {
  id: string;
  lead_id: string;
  rep_id: string;
  note: string;
  leads: {
    contacts: {
      first_name: string | null;
      last_name: string | null;
      address: string | null;
      suburb: string | null;
    };
  };
};

type PushSubscriptionRow = {
  id: string;
  platform: "web" | "expo";
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
};

export async function sendFollowUpReminders(): Promise<FollowUpRemindersCronResponse> {
  ensureVapidConfigured();
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: dueRows, error: dueError } = await supabase
    .from("follow_ups")
    .select(
      `
      id,
      lead_id,
      rep_id,
      note,
      leads!inner (
        contacts!inner (
          first_name,
          last_name,
          address,
          suburb
        )
      )
    `,
    )
    .eq("completed", false)
    .is("reminded_at", null)
    .lte("due_at", now);

  if (dueError) {
    throw dueError;
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of (dueRows ?? []) as DueFollowUpRow[]) {
    const contact = row.leads.contacts;
    const contactName = formatContactDisplayName({
      first_name: contact.first_name,
      last_name: contact.last_name,
      address: contact.address,
      suburb: contact.suburb,
    });
    const body = row.note.trim() || `Follow up with ${contactName}`;
    const webUrl = `/rep/pipeline/${row.lead_id}`;
    const mobileUrl = `sunflare://pipeline/${row.lead_id}`;

    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, platform, endpoint, p256dh, auth")
      .eq("rep_id", row.rep_id);

    if (subsError) {
      throw subsError;
    }

    const subs = (subscriptions ?? []) as PushSubscriptionRow[];

    if (subs.length === 0) {
      skipped += 1;
      await markReminded(supabase, row.id);
      continue;
    }

    let anySent = false;
    const expiredIds: string[] = [];

    for (const sub of subs) {
      try {
        if (sub.platform === "expo") {
          const result = await sendExpoPushNotification({
            token: sub.endpoint,
            title: "Follow-up due",
            body,
            url: mobileUrl,
          });

          if (result.sent) {
            anySent = true;
          } else if (result.expired) {
            expiredIds.push(sub.id);
          } else {
            errors += 1;
          }
          continue;
        }

        if (!sub.p256dh || !sub.auth) {
          expiredIds.push(sub.id);
          continue;
        }

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: "Follow-up due",
            body,
            url: webUrl,
          }),
        );
        anySent = true;
      } catch (e: unknown) {
        const statusCode =
          e &&
          typeof e === "object" &&
          "statusCode" in e &&
          typeof (e as { statusCode?: number }).statusCode === "number"
            ? (e as { statusCode: number }).statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id);
        } else {
          errors += 1;
        }
      }
    }

    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }

    if (anySent) {
      sent += 1;
      await markReminded(supabase, row.id);
    } else if (expiredIds.length === subs.length) {
      skipped += 1;
      await markReminded(supabase, row.id);
    }
  }

  return { sent, skipped, errors };
}

async function markReminded(
  supabase: ReturnType<typeof createAdminClient>,
  followUpId: string,
): Promise<void> {
  const { error } = await supabase
    .from("follow_ups")
    .update({ reminded_at: new Date().toISOString() } as never)
    .eq("id", followUpId);

  if (error) {
    throw error;
  }
}
