# Sunflare Mobile — OTA updates (M8.4)

[EAS Update](https://docs.expo.dev/eas-update/introduction/) delivers JavaScript bundle updates without reinstalling the APK.

## Configuration

- `app.config.ts`: `runtimeVersion` policy `appVersion`, `expo-updates` plugin
- `eas.json`: `channel` per build profile (`preview`, `production`, `development`)
- Cold start: `checkForAppUpdate()` in root layout (skipped in `__DEV__`)

## Publish an update

After `eas init`, publish to the channel that matches the installed APK:

```bash
cd apps/mobile
eas update --channel preview --message "Fix pipeline list refresh"
```

Reps on the `preview` channel receive the bundle on next cold start (app reloads after download).

## Profile screen

Profile shows:

- App version + native build number
- EAS update **channel** and **runtime version**
- Last update check result (idle / unavailable in dev / error message)

## Requires new APK

Publish a new `eas build` when changing native code or `runtimeVersion`, including:

- Adding/removing Expo config plugins
- Upgrading Expo SDK or React Native
- Changing Mapbox, SQLite, notifications, or background location native setup
