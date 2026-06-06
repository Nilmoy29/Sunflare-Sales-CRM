import { createKnock } from "@/features/knocks/api";
import { enqueuePendingKnock } from "@/features/knocks/pending-knocks-store";
import type { LeadSummary } from "@/lib/validators/leads";
import type {
  CreateKnockBody,
  KnockPin,
  PendingKnockPin,
} from "@/lib/validators/knocks";

export type SubmitKnockResult =
  | { mode: "online"; knock: KnockPin; lead?: LeadSummary }
  | { mode: "offline"; pending: PendingKnockPin };

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error && error.message === "Failed to fetch") {
    return true;
  }
  return false;
}

export async function submitKnock(
  body: CreateKnockBody,
): Promise<SubmitKnockResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      mode: "offline",
      pending: await enqueuePendingKnock(body),
    };
  }

  try {
    const { knock, lead } = await createKnock(body);
    return lead ? { mode: "online", knock, lead } : { mode: "online", knock };
  } catch (error: unknown) {
    if (isNetworkError(error)) {
      return {
        mode: "offline",
        pending: await enqueuePendingKnock(body),
      };
    }
    throw error;
  }
}
