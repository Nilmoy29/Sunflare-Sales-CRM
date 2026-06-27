---
story: M8.3
epic: 8
title: EAS Preview APK Build
status: done
date: 2026-06-26
---

# Story M8.3: EAS Preview APK Build

Status: **done**

## File List

- `apps/mobile/eas.json` — `preview-apk` profile (APK, `preview` channel)
- `apps/mobile/docs/APK_DISTRIBUTION.md` — build, secrets, sideload instructions

## Build command

```bash
cd apps/mobile
eas build --profile preview-apk --platform android
```

## EAS secrets (required)

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `EXPO_PUBLIC_API_URL`

Run `eas init` once to link project ID before first build.
