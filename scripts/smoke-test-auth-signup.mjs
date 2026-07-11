#!/usr/bin/env node
/**
 * Auth signup smoke test — verifies rep invite/signup flow.
 *
 * Prerequisites:
 *   - Dev server running (default http://localhost:3000)
 *   - `.env.local` with Supabase keys + TEST_LOGIN_PASSWORD
 */

import { createClient } from "@supabase/supabase-js";
import {
  cookiesFromResponse,
  envCredential,
  fetchOnce,
  fetchPage,
  loadEnvLocal,
  loginWithForm,
  printSummary,
  runCheck,
} from "./lib/smoke-utils.mjs";

loadEnvLocal();

const base = process.env.TEST_SMOKE_BASE ?? "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = envCredential(
  process.env.TEST_LOGIN_EMAIL ?? "admin+sunflare@test.com",
  "TEST_LOGIN_EMAIL",
);
const adminPassword = envCredential(
  process.env.TEST_LOGIN_PASSWORD,
  "TEST_LOGIN_PASSWORD",
);

/** @type {import("./lib/smoke-utils.mjs").SmokeResult[]} */
const results = [];

function section(title) {
  console.log("");
  console.log(title);
  console.log("─".repeat(title.length));
}

function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function mergeCookies(existing, next) {
  const jar = new Map();
  for (const part of (existing ? `${existing}; ${next}` : next).split("; ")) {
    const eq = part.indexOf("=");
    if (eq !== -1) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function followRedirects(url, cookies = "", max = 10) {
  let currentUrl = url;
  let cookieHeader = cookies;

  for (let i = 0; i < max; i++) {
    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });

    const nextCookies = cookiesFromResponse(response);
    if (nextCookies) {
      cookieHeader = mergeCookies(cookieHeader, nextCookies);
    }

    const location = response.headers.get("location");
    const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
    if (isRedirect && location) {
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    const text = await response.text();
    return {
      status: response.status,
      url: currentUrl,
      cookies: cookieHeader,
      text,
    };
  }

  throw new Error(`Too many redirects from ${url}`);
}

/**
 * Establish an invite signup session via the server callback token_hash path
 * (same destination the email link reaches after Supabase verify).
 */
async function establishInviteSession(admin, email) {
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${base}/auth/callback?next=/signup`,
      },
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error(linkError?.message ?? "generateLink failed");
  }

  const callbackResult = await followRedirects(
    `${base}/auth/callback?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=recovery&next=/signup`,
  );

  if (!callbackResult.url.includes("/signup")) {
    throw new Error(`expected /signup, got ${callbackResult.url}`);
  }
  if (!callbackResult.cookies.includes("invite_onboarding")) {
    throw new Error(
      `invite_onboarding cookie missing (landed ${callbackResult.url})`,
    );
  }

  return callbackResult.cookies;
}

async function cleanupUser(admin, userId) {
  if (!userId) return;
  await admin.auth.admin.deleteUser(userId);
}

async function cleanupSmokeUsers(admin) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const smoke = (data?.users ?? []).filter((u) =>
    /^(rep-signup-smoke\+|rep-create-smoke\+|rep-smoke\+|rep-browser-test\+)/.test(
      u.email ?? "",
    ),
  );
  for (const user of smoke) {
    await admin.auth.admin.deleteUser(user.id);
  }
  return smoke.length;
}

async function main() {
  console.log(`Auth signup smoke test → ${base}`);

  if (!adminPassword) {
    console.error("Set TEST_LOGIN_PASSWORD in .env.local");
    process.exit(1);
  }

  const admin = createAdminClient();
  const cleaned = await cleanupSmokeUsers(admin);
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} leftover smoke test user(s)`);
  }

  section("Public auth routes");

  await runCheck(
    "auth",
    "GET /signup loads without auth",
    async () => {
      const page = await fetchPage(`${base}/signup`);
      if (page.status !== 200) {
        throw new Error(`expected HTTP 200, got ${page.status}`);
      }
      if (!page.url.includes("/signup")) {
        throw new Error(`expected /signup, got ${page.url}`);
      }
    },
    results,
  );

  await runCheck(
    "auth",
    "GET /signup shows invite guidance when unauthenticated",
    async () => {
      const { text } = await followRedirects(`${base}/signup`);
      if (!text.includes("Account setup requires an invite")) {
        throw new Error("expected invite guidance copy on /signup");
      }
    },
    results,
  );

  await runCheck(
    "auth",
    "GET /invite/accept redirects to /signup",
    async () => {
      const res = await fetchOnce(`${base}/invite/accept`);
      if (![302, 303, 307, 308].includes(res.status)) {
        throw new Error(`expected redirect, got HTTP ${res.status}`);
      }
      if (!res.location?.includes("/signup")) {
        throw new Error(`expected /signup redirect, got ${res.location}`);
      }
    },
    results,
  );

  await runCheck(
    "auth",
    "GET /login links to /signup",
    async () => {
      const { text } = await followRedirects(`${base}/login`);
      if (!text.includes("/signup") || !text.includes("Complete account setup")) {
        throw new Error("login page missing signup link");
      }
    },
    results,
  );

  await runCheck(
    "auth",
    "GET /signup is public (no login redirect)",
    async () => {
      const res = await fetchOnce(`${base}/signup`);
      if ([302, 303, 307, 308].includes(res.status) && res.location?.includes("/login")) {
        throw new Error(`signup should not redirect to login, got ${res.location}`);
      }
    },
    results,
  );

  await runCheck(
    "auth",
    "Hash-only callback hands off to /signup without invalid_invite",
    async () => {
      const res = await fetchOnce(
        `${base}/auth/callback?next=/signup`,
      );
      if (![302, 303, 307, 308].includes(res.status)) {
        throw new Error(`expected redirect, got HTTP ${res.status}`);
      }
      if (!res.location?.includes("/signup")) {
        throw new Error(`expected /signup, got ${res.location}`);
      }
      if (res.location.includes("invalid_invite")) {
        throw new Error("callback should not mark hash handoff as invalid_invite");
      }
    },
    results,
  );

  section("Invite onboarding E2E");

  const testEmail = `rep-signup-smoke+${Date.now()}@gmail.com`;
  const testPassword = `SmokeTest!${Date.now().toString(36)}`;
  const testName = "Signup Smoke Rep";
  let createdUserId = null;
  let inviteCookies = "";

  try {
    await runCheck(
      "auth",
      "createUser provisions rep profile",
      async () => {
        const { data, error } = await admin.auth.admin.createUser({
          email: testEmail,
          email_confirm: true,
          user_metadata: { name: testName, role: "rep" },
        });
        if (error || !data.user) {
          throw new Error(error?.message ?? "createUser failed");
        }
        createdUserId = data.user.id;

        const { data: profile, error: profileError } = await admin
          .from("profiles")
          .select("role, active, name")
          .eq("id", createdUserId)
          .maybeSingle();
        if (profileError || !profile) {
          throw new Error("profile row missing after createUser");
        }
        if (profile.role !== "rep" || profile.active !== true) {
          throw new Error(`unexpected profile: ${JSON.stringify(profile)}`);
        }
      },
      results,
    );

    await runCheck(
      "auth",
      "Recovery callback establishes signup session + invite cookie",
      async () => {
        inviteCookies = await establishInviteSession(admin, testEmail);
      },
      results,
    );

    await runCheck(
      "auth",
      "GET /signup shows form with valid invite session",
      async () => {
        const { text, status } = await followRedirects(
          `${base}/signup`,
          inviteCookies,
        );
        if (status !== 200) {
          throw new Error(`expected HTTP 200, got ${status}`);
        }
        if (!text.includes('name="name"') || !text.includes('name="password"')) {
          throw new Error(
            "signup form fields not rendered for valid invite session",
          );
        }
        if (text.includes("Account setup requires an invite")) {
          throw new Error("signup still shows invite guidance with valid session");
        }
      },
      results,
    );

    await runCheck(
      "auth",
      "acceptInviteAction completes signup and login works",
      async () => {
        // Mirror acceptInviteAction: set password + profile while invite session is active.
        const { data: linkData, error: linkError } =
          await admin.auth.admin.generateLink({
            type: "recovery",
            email: testEmail,
          });
        if (linkError || !linkData?.properties?.hashed_token) {
          throw new Error(
            linkError?.message ?? "generateLink for password set failed",
          );
        }

        const anon = createClient(supabaseUrl, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { error: otpError } = await anon.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: "recovery",
        });
        if (otpError) {
          throw new Error(`verifyOtp for password set: ${otpError.message}`);
        }

        const { error: updateError } = await anon.auth.updateUser({
          password: testPassword,
          data: { name: testName, role: "rep" },
        });
        if (updateError) {
          throw new Error(`updateUser: ${updateError.message}`);
        }

        const { error: profileError } = await admin
          .from("profiles")
          .update({ name: testName, phone: null })
          .eq("id", createdUserId);
        if (profileError) {
          throw new Error(`profile update: ${profileError.message}`);
        }

        await anon.auth.signOut();

        const login = await loginWithForm(base, testEmail, testPassword);
        if (!login.redirectLocation?.includes("/rep/map")) {
          throw new Error(
            `expected /rep/map after login, got ${login.redirectLocation}`,
          );
        }

        const profileRes = await fetch(`${base}/api/auth/profile`, {
          headers: { cookie: login.cookies },
        });
        const profileJson = await profileRes.json();
        if (profileJson.role !== "rep" || profileJson.active !== true) {
          throw new Error(
            `unexpected post-login profile: ${JSON.stringify(profileJson)}`,
          );
        }
      },
      results,
    );
  } finally {
    await cleanupUser(admin, createdUserId);
  }

  section("Admin team + create-rep invite path");

  await runCheck(
    "auth",
    "Admin can access /admin/team",
    async () => {
      const login = await loginWithForm(base, adminEmail, adminPassword);
      const page = await fetchPage(`${base}/admin/team`, {
        cookies: login.cookies,
      });
      if (page.status !== 200 || page.url.includes("/login")) {
        throw new Error("admin cannot access team page");
      }
      const { text } = await followRedirects(
        `${base}/admin/team`,
        login.cookies,
      );
      if (!text.includes("Create rep") || !text.includes("Invite rep")) {
        throw new Error("team page missing create/invite UI");
      }
      if (!text.includes("emails a secure sign-up link")) {
        throw new Error("create-rep copy not updated for invite flow");
      }
    },
    results,
  );

  const createEmail = `rep-create-smoke+${Date.now()}@gmail.com`;
  let createUserId = null;

  try {
    await runCheck(
      "auth",
      "inviteUserByEmail (create-rep path) lands on /signup with cookie",
      async () => {
        // Prefer inviteUserByEmail; fall back to createUser + recovery if rate-limited.
        let email = createEmail;
        const invite = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${base}/auth/callback?next=/signup`,
          data: { name: "Create Smoke Rep", role: "rep" },
        });

        if (invite.error) {
          if (!/rate limit/i.test(invite.error.message)) {
            throw new Error(invite.error.message);
          }
          const created = await admin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { name: "Create Smoke Rep", role: "rep" },
          });
          if (created.error || !created.data.user) {
            throw new Error(created.error?.message ?? "createUser fallback failed");
          }
          createUserId = created.data.user.id;
          const cookies = await establishInviteSession(admin, email);
          if (!cookies.includes("invite_onboarding")) {
            throw new Error("invite cookie missing after rate-limit fallback");
          }
          return;
        }

        createUserId = invite.data.user.id;
        const { data: linkData, error: linkError } =
          await admin.auth.admin.generateLink({
            type: "invite",
            email,
            options: { redirectTo: `${base}/auth/callback?next=/signup` },
          });

        if (linkError || !linkData?.properties?.hashed_token) {
          // invite already sent — use recovery for session establishment
          const cookies = await establishInviteSession(admin, email);
          if (!cookies.includes("invite_onboarding")) {
            throw new Error("invite cookie missing");
          }
          return;
        }

        const callbackResult = await followRedirects(
          `${base}/auth/callback?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=invite&next=/signup`,
        );
        if (!callbackResult.url.includes("/signup")) {
          throw new Error(
            `created rep invite did not reach /signup (${callbackResult.url})`,
          );
        }
        if (!callbackResult.cookies.includes("invite_onboarding")) {
          throw new Error("invite_onboarding cookie missing for created rep");
        }
      },
      results,
    );
  } finally {
    await cleanupUser(admin, createUserId);
  }

  const failed = printSummary(results);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("");
  console.error(
    "Auth signup smoke test crashed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
