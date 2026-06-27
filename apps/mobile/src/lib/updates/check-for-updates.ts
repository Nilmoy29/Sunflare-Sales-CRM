import * as Updates from "expo-updates";

export type UpdateCheckResult =
  | { status: "unavailable" }
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; manifestId?: string }
  | { status: "downloaded"; manifestId?: string }
  | { status: "error"; message: string };

let lastResult: UpdateCheckResult = { status: "idle" };

export function getLastUpdateCheckResult(): UpdateCheckResult {
  return lastResult;
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  if (__DEV__ || !Updates.isEnabled) {
    lastResult = { status: "unavailable" };
    return lastResult;
  }

  lastResult = { status: "checking" };

  try {
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) {
      lastResult = { status: "idle" };
      return lastResult;
    }

    await Updates.fetchUpdateAsync();
    lastResult = {
      status: "downloaded",
      manifestId: Updates.updateId ?? undefined,
    };
    await Updates.reloadAsync();
    return lastResult;
  } catch (e: unknown) {
    lastResult = {
      status: "error",
      message: e instanceof Error ? e.message : "Update check failed",
    };
    return lastResult;
  }
}

export function getUpdateChannelLabel(): string {
  return Updates.channel ?? "none";
}

export function getRuntimeVersionLabel(): string {
  return Updates.runtimeVersion ?? "unknown";
}
