---
story: M8.4
epic: 8
title: OTA Updates and Version Display
status: done
date: 2026-06-26
---

# Story M8.4: OTA Updates and Version Display

Status: **done**

## File List

- `apps/mobile/app.config.ts` — `runtimeVersion`, `expo-updates`, `expo-notifications` plugins
- `apps/mobile/eas.json` — update channels per profile
- `apps/mobile/src/lib/updates/check-for-updates.ts` — cold-start check + reload
- `apps/mobile/app/_layout.tsx` — invokes update check on launch
- `apps/mobile/app/(tabs)/profile/index.tsx` — version, build, channel, runtime, OTA status
- `apps/mobile/docs/OTA_UPDATES.md` — publish workflow + APK vs OTA guidance

## Publish OTA

```bash
cd apps/mobile
eas update --channel preview --message "Description"
```

## Notes

- Update check skipped in `__DEV__` and when Updates is disabled.
- Native module changes still require a new `eas build`.
