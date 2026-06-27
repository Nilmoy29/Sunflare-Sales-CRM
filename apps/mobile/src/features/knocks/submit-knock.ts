import type { CreateKnockBody } from "@sunflare/shared";
import { createKnock } from "@/features/knocks/api";
import { enqueuePendingKnock } from "@/lib/sqlite/pending-knocks";
import type {
  KnockPin,
  PendingKnockPin,
  SubmitKnockResult,
} from "@/features/knocks/types";
import NetInfo from "@react-native-community/netinfo";

export type { SubmitKnockResult };

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error && error.message === "Network request failed") {
    return true;
  }
  return false;
}

async function isOffline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== true;
}

export async function submitKnock(
  body: CreateKnockBody,
): Promise<SubmitKnockResult> {
  if (await isOffline()) {
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

export function isPromotableDoorOutcome(outcome: string): boolean {
  return outcome === "interested" || outcome === "callback_requested";
}
