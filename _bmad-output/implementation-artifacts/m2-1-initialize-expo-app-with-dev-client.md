---
story: M2.1
epic: 2
title: Initialize Expo App with Dev Client
status: done
date: 2026-06-26
---

# Story M2.1: Initialize Expo App with Dev Client

Status: **done**

## File List

- `apps/mobile/` — Expo SDK 56, expo-router, expo-dev-client
- `apps/mobile/app/_layout.tsx`, `app/index.tsx`
- `apps/mobile/eas.json` — development + preview-apk profiles
- `apps/mobile/app.json` — `com.sunflare.mobile`, scheme `sunflare://`
- `apps/mobile/.env.example`

## Verify

```bash
cd apps/mobile && npm start
```

Dev client native build (`eas build --profile development`) required before Mapbox (M2.2).
