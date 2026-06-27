---
story: M3.3
epic: 3
title: Password Reset Deep Link
status: done
date: 2026-06-26
---

# Story M3.3: Password Reset Deep Link

Status: **done**

## File List

- `app/(auth)/reset-password.tsx`
- `src/providers/auth-provider.tsx` — `Linking` session from recovery URL

## Supabase config

Add redirect URL in Supabase Auth → URL configuration:

- `sunflare://reset-password`
