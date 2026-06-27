#!/usr/bin/env node
/**
 * Verifies mobile Bearer auth against /api/v1/shifts/current (Story M1.3).
 *
 * Prerequisites:
 *   - Server running (TEST_SMOKE_BASE or http://localhost:3000)
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - TEST_REP_EMAIL + TEST_REP_PASSWORD
 */

import { envCredential, loadEnvLocal } from "./lib/smoke-utils.mjs";

loadEnvLocal();

const base = process.env.TEST_SMOKE_BASE ?? "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const repEmail = envCredential(process.env.TEST_REP_EMAIL, "TEST_REP_EMAIL");
const repPassword = envCredential(
  process.env.TEST_REP_PASSWORD,
  "TEST_REP_PASSWORD",
);

async function signInRep() {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ email: repEmail, password: repPassword }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase sign-in failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  if (!json.access_token) {
    throw new Error("No access_token in sign-in response");
  }
  return json.access_token;
}

async function main() {
  if (!supabaseUrl || !anonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }
  if (!repEmail || !repPassword) {
    console.error("Set TEST_REP_EMAIL and TEST_REP_PASSWORD in .env.local");
    process.exit(1);
  }

  const unauth = await fetch(`${base}/api/v1/shifts/current`);
  if (unauth.status !== 401) {
    console.error(`Expected 401 without auth, got ${unauth.status}`);
    process.exit(1);
  }
  console.log("OK — unauthenticated request returns 401");

  const token = await signInRep();
  const authed = await fetch(`${base}/api/v1/shifts/current`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (authed.status !== 200) {
    const body = await authed.text();
    console.error(`Expected 200 with Bearer, got ${authed.status}: ${body}`);
    process.exit(1);
  }

  const json = await authed.json();
  if (!("data" in json)) {
    console.error("Response missing data envelope");
    process.exit(1);
  }

  console.log("OK — Bearer auth on GET /api/v1/shifts/current");
  console.log(JSON.stringify(json.data));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
