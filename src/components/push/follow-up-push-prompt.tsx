"use client";

import { useEffect, useState } from "react";
import {
  disablePushReminders,
  enablePushReminders,
  getExistingPushSubscription,
  getPushSupportState,
} from "@/features/push/client-subscribe";

type PromptState =
  | "loading"
  | "unsupported"
  | "default"
  | "enabled"
  | "denied"
  | "error";

async function resolvePromptState(): Promise<PromptState> {
  if (getPushSupportState() === "unsupported") {
    return "unsupported";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  const subscription = await getExistingPushSubscription();
  if (Notification.permission === "granted" && subscription) {
    return "enabled";
  }

  return "default";
}

export function FollowUpPushPrompt() {
  const [state, setState] = useState<PromptState>(() =>
    getPushSupportState() === "unsupported" ? "unsupported" : "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state !== "loading") {
      return;
    }

    let cancelled = false;
    void resolvePromptState().then((next) => {
      if (!cancelled) {
        setState(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state]);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      await enablePushReminders();
      setState("enabled");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Could not enable reminders",
      );
      if (Notification.permission === "denied") {
        setState("denied");
      } else {
        setState("error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      await disablePushReminders();
      setState("default");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Could not turn off reminders",
      );
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return null;
  }

  if (state === "unsupported") {
    return (
      <p className="text-sm text-zinc-500">
        Browser reminders are not supported on this device.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-sm text-zinc-500">
        Notifications are blocked. Enable them in your browser settings to get
        follow-up reminders.
      </p>
    );
  }

  if (state === "enabled") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-sm text-zinc-700">
          Browser reminders are on. You will get an alert when a follow-up is
          due.
        </p>
        <button
          type="button"
          onClick={() => {
            void handleDisable();
          }}
          disabled={busy}
          className="min-h-11 w-fit rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
        >
          {busy ? "Turning off…" : "Turn off reminders"}
        </button>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-sm text-zinc-700">
        Get a browser reminder when a follow-up is due. Sunflare only sends
        follow-up alerts.
      </p>
      <button
        type="button"
        onClick={() => {
          void handleEnable();
        }}
        disabled={busy}
        className="min-h-11 w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {busy ? "Enabling…" : "Enable reminders"}
      </button>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
