import * as SecureStore from "expo-secure-store";

const PROMPT_KEY = "sunflare_push_prompt_status";

export type PushPromptStatus = "pending" | "enabled" | "declined";

export async function getPushPromptStatus(): Promise<PushPromptStatus> {
  const value = await SecureStore.getItemAsync(PROMPT_KEY);
  if (value === "enabled" || value === "declined") {
    return value;
  }
  return "pending";
}

export async function setPushPromptStatus(status: PushPromptStatus): Promise<void> {
  await SecureStore.setItemAsync(PROMPT_KEY, status);
}
