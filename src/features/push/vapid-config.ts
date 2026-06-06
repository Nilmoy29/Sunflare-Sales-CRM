import webpush from "web-push";

let configured = false;

export function ensureVapidConfigured(): void {
  if (configured) {
    return;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "mailto:support@sunflare.local";

  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export { webpush };
