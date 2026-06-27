# Mobile smoke test checklist (Epic M1–M8)

Run **after** `npm run smoke` and `npm run verify:bearer` pass against a running API.

## Setup

- [ ] Dev client or preview APK installed (not Expo Go)
- [ ] `apps/mobile/.env` points `EXPO_PUBLIC_API_URL` at reachable API (LAN IP for device)
- [ ] Rep test account (`TEST_REP_*` in `.env.local`)

## Auth (M3)

- [ ] Login with rep credentials
- [ ] Admin account shows block screen with link to web admin
- [ ] Logout from Profile

## Shift & GPS (M4)

- [ ] Start shift from Map tab
- [ ] Location permission granted; rep dot on map
- [ ] End shift; GPS stops

## Map & knocks (M5)

- [ ] Map loads pins and territory overlay
- [ ] Tap map → door outcome sheet → save knock
- [ ] Airplane mode → knock queues as pending → reconnect syncs

## Pipeline (M6)

- [ ] Pipeline list grouped by stage
- [ ] Lead detail opens; stage update works
- [ ] Schedule follow-up saves

## Calls (M7)

- [ ] Search/create contact
- [ ] Log call outcome; tel: link opens dialer
- [ ] Promote interested call to pipeline

## History & push (M8)

- [ ] History tab: knocks + calls filter by date/outcome
- [ ] Pending knock shows “Pending sync” badge
- [ ] Pipeline first visit → push opt-in modal
- [ ] Enable reminders → system permission → Profile shows “on”
- [ ] (Optional) Cron follow-up → notification → tap opens lead detail

## Profile & updates (M8)

- [ ] Profile shows version, build, update channel
- [ ] API health row shows ok

## Build (M8.3)

- [ ] `eas build --profile preview-apk` produces installable APK
