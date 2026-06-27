# Sunflare Mobile — APK distribution (M8.3)

Internal Android rollout uses **EAS Build** with the `preview-apk` profile.

## Prerequisites

1. [Expo account](https://expo.dev) and EAS CLI: `npm install -g eas-cli`
2. From `apps/mobile`: `eas login` then `eas init` (links EAS project ID)
3. Android keystore: `eas credentials` (EAS can generate a managed keystore)
4. EAS secrets for build-time env (Project → Secrets):

| Secret | Purpose |
| :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox public token |
| `EXPO_PUBLIC_API_URL` | Production API base (e.g. `https://your-app.vercel.app`) |

Optional: `SENTRY_DSN` if crash reporting is added later.

## Build preview APK

```bash
cd apps/mobile
eas build --profile preview-apk --platform android
```

The artifact is a signed **APK** (`buildType: apk`) suitable for sideload or a private Play track.

## Install on device (sideload)

1. Download the APK from the EAS build page.
2. On Android 10+, enable **Install unknown apps** for your file manager or browser.
3. Open the APK and confirm install.
4. Launch **Sunflare** and sign in with a rep account.

Mapbox and background location require this native build — **Expo Go is not supported** for field map/GPS.

## Profiles

| Profile | Channel | Output | Use |
| :--- | :--- | :--- | :--- |
| `development` | `development` | APK + dev client | Local debugging |
| `preview-apk` | `preview` | APK | Internal pilot |
| `production` | `production` | AAB | Play Store / private track |

## When a new APK is required

Ship a new native build when you change:

- Expo SDK or native modules (`@rnmapbox/maps`, `expo-location`, etc.)
- `app.config.ts` plugins or Android permissions
- `runtimeVersion` policy target

JS-only fixes can go out via **EAS Update** (see `docs/OTA_UPDATES.md`).
