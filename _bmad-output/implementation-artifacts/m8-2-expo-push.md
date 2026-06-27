---
story: M8.2
epic: 8
title: Expo Push Notifications for Follow-Ups
status: done
date: 2026-06-26
---

# Story M8.2: Expo Push Notifications for Follow-Ups

Status: **done**

## File List

- `supabase/migrations/20260626100000_push_subscriptions_expo_platform.sql` — `platform` column; nullable VAPID keys
- `src/lib/validators/push.ts` — web + expo subscribe union
- `src/features/push/upsert-push-subscription.ts` — stores expo token in `endpoint`
- `src/features/push/send-expo-push.ts` — Expo Push API sender
- `src/features/push/send-follow-up-reminders.ts` — dispatches web + expo per subscription
- `apps/mobile/src/features/push/api.ts` — mobile subscribe/unsubscribe
- `apps/mobile/src/features/push/notifications.ts` — permission, token, Android channel
- `apps/mobile/src/features/push/prompt-state.ts` — opt-in persistence (SecureStore)
- `apps/mobile/src/providers/push-provider.tsx` — opt-in modal + tap → lead detail
- `apps/mobile/app/(tabs)/pipeline/index.tsx` — first pipeline visit triggers opt-in
- `apps/mobile/app/(tabs)/profile/index.tsx` — re-enable reminders link

## Notes

- Expo tokens register via `POST /api/v1/push/subscribe` with `{ platform: "expo", expo_push_token }`.
- Cron sends mobile deep link `sunflare://pipeline/{leadId}`; tap opens `/(tabs)/pipeline/[leadId]`.
- Requires physical device + dev/preview APK build for push delivery.
