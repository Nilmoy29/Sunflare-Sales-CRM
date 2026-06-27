#!/usr/bin/env node
/**
 * Sunflare smoke test — verifies Epics 1–8 via health, auth, page loads, and API checks.
 *
 * Prerequisites:
 *   - Dev or production server running (default http://localhost:3000)
 *   - `.env.local` with Supabase keys
 *   - Test users in Supabase (see docs/SETUP_KEYS.md)
 *
 * Env vars:
 *   TEST_SMOKE_BASE          — base URL (default http://localhost:3000)
 *   TEST_LOGIN_EMAIL         — admin email (default admin+sunflare@test.com)
 *   TEST_LOGIN_PASSWORD      — admin password (required)
 *   TEST_REP_EMAIL           — rep email (optional; rep-only checks skipped if unset)
 *   TEST_REP_PASSWORD        — rep password (optional)
 */

import {
  assertHasData,
  assertStatus,
  envCredential,
  fetchJson,
  fetchOnce,
  fetchPage,
  loadEnvLocal,
  loginWithForm,
  printSummary,
  runCheck,
  signInRepBearer,
  skipCheck,
  SYDNEY_BBOX,
  sydneyToday,
} from "./lib/smoke-utils.mjs";

loadEnvLocal();

const base = process.env.TEST_SMOKE_BASE ?? process.env.TEST_LOGIN_BASE ?? "http://localhost:3000";
const adminEmail = envCredential(
  process.env.TEST_LOGIN_EMAIL ?? "admin+sunflare@test.com",
  "TEST_LOGIN_EMAIL",
);
const adminPassword = envCredential(process.env.TEST_LOGIN_PASSWORD, "TEST_LOGIN_PASSWORD");
const repEmail = envCredential(process.env.TEST_REP_EMAIL, "TEST_REP_EMAIL");
const repPassword = envCredential(process.env.TEST_REP_PASSWORD, "TEST_REP_PASSWORD");

/** @type {import("./lib/smoke-utils.mjs").SmokeResult[]} */
const results = [];

function section(title) {
  console.log("");
  console.log(title);
  console.log("─".repeat(title.length));
}

async function main() {
  console.log(`Sunflare smoke test → ${base}`);
  console.log(`Date (Sydney): ${sydneyToday()}`);

  if (!adminPassword) {
    console.error("");
    console.error("Set TEST_LOGIN_PASSWORD in .env.local (admin test account).");
    console.error("See docs/SETUP_KEYS.md for creating test users.");
    process.exit(1);
  }

  // ── Epic 1: Secure Team Access & Foundation ──────────────────────────────
  section("Epic 1 — Secure Team Access & Foundation");

  await runCheck("1", "GET /api/v1/health returns ok", async () => {
    const { response, json } = await fetchJson(`${base}/api/v1/health`);
    assertStatus(response.status, 200, "health");
    assertHasData(json, "health");
    if (json.data.status !== "ok") {
      throw new Error(`health status expected "ok", got ${json.data.status}`);
    }
  }, results);

  await runCheck("1", "Unauthenticated /admin/dashboard redirects to login", async () => {
    const page = await fetchOnce(`${base}/admin/dashboard`);
    if (page.status !== 307 && page.status !== 302 && page.status !== 303) {
      throw new Error(`expected redirect, got HTTP ${page.status}`);
    }
    if (!page.location?.includes("/login")) {
      throw new Error(`expected /login redirect, got ${page.location}`);
    }
  }, results);

  await runCheck("1", "Unauthenticated API returns 401", async () => {
    const { response, json } = await fetchJson(`${base}/api/v1/leads`);
    assertStatus(response.status, 401, "leads without auth");
    if (!json?.error?.code) {
      throw new Error("leads without auth: expected { error: { code } } body");
    }
  }, results);

  await runCheck("1", "GET /login page loads", async () => {
    const page = await fetchPage(`${base}/login`);
    if (page.status !== 200) {
      throw new Error(`expected HTTP 200, got ${page.status}`);
    }
  }, results);

  let adminCookies;
  await runCheck("1", "Admin login via POST /api/auth/login", async () => {
    const login = await loginWithForm(base, adminEmail, adminPassword);
    adminCookies = login.cookies;
    if (!login.redirectLocation?.includes("/admin/dashboard")) {
      throw new Error(
        `expected redirect to /admin/dashboard, got ${login.redirectLocation}`,
      );
    }
  }, results);

  await runCheck("1", "GET /api/auth/profile returns admin role", async () => {
    const { response, json } = await fetchJson(`${base}/api/auth/profile`, {
      cookies: adminCookies,
    });
    assertStatus(response.status, 200, "auth profile");
    if (json.role !== "admin" || json.active !== true) {
      throw new Error(`expected active admin profile, got ${JSON.stringify(json)}`);
    }
  }, results);

  await runCheck("1", "Admin pages load (dashboard, team, settings)", async () => {
    for (const path of ["/admin/dashboard", "/admin/team", "/admin/settings"]) {
      const page = await fetchPage(`${base}${path}`, { cookies: adminCookies });
      if (page.status !== 200) {
        throw new Error(
          `${path}: expected HTTP 200 after redirects, got ${page.status} at ${page.url}`,
        );
      }
      if (page.url.includes("/login")) {
        throw new Error(`${path}: session lost — ended at login`);
      }
    }
  }, results);

  let repCookies;
  if (repEmail && repPassword) {
    await runCheck("1", "Rep login via POST /api/auth/login", async () => {
      const login = await loginWithForm(base, repEmail, repPassword);
      repCookies = login.cookies;
      if (!login.redirectLocation?.includes("/rep/map")) {
        throw new Error(
          `expected redirect to /rep/map, got ${login.redirectLocation}`,
        );
      }
    }, results);

    await runCheck("1", "GET /api/auth/profile returns rep role", async () => {
      const { response, json } = await fetchJson(`${base}/api/auth/profile`, {
        cookies: repCookies,
      });
      assertStatus(response.status, 200, "rep profile");
      if (json.role !== "rep" || json.active !== true) {
        throw new Error(`expected active rep profile, got ${JSON.stringify(json)}`);
      }
    }, results);

    await runCheck("1", "Rep blocked from /admin/dashboard", async () => {
      const page = await fetchPage(`${base}/admin/dashboard`, {
        cookies: repCookies,
      });
      if (page.url.includes("/admin/dashboard") && page.status === 200) {
        throw new Error("rep should not access admin dashboard");
      }
      if (!page.url.includes("/forbidden") && !page.url.includes("/login")) {
        throw new Error(`expected /forbidden or /login, got ${page.url}`);
      }
    }, results);

    await runCheck("1", "GET /rep/profile page loads", async () => {
      const page = await fetchPage(`${base}/rep/profile`, { cookies: repCookies });
      if (page.status !== 200) {
        throw new Error(`expected HTTP 200, got ${page.status}`);
      }
    }, results);
  } else {
    skipCheck(
      "1",
      "Rep login and profile checks",
      "set TEST_REP_EMAIL and TEST_REP_PASSWORD",
      results,
    );
  }

  // ── Epic 2: Field Shift & Door-to-Door Logging ─────────────────────────
  section("Epic 2 — Field Shift & Door-to-Door Logging");

  if (repCookies) {
    await runCheck("2", "GET /rep/map page loads", async () => {
      const page = await fetchPage(`${base}/rep/map`, { cookies: repCookies });
      if (page.status !== 200) {
        throw new Error(`expected HTTP 200, got ${page.status}`);
      }
    }, results);

    await runCheck("2", "GET /rep/history page loads", async () => {
      const page = await fetchPage(`${base}/rep/history`, { cookies: repCookies });
      if (page.status !== 200) {
        throw new Error(`expected HTTP 200, got ${page.status}`);
      }
    }, results);

    await runCheck("2", "GET /api/v1/shifts/current", async () => {
      const { response, json } = await fetchJson(`${base}/api/v1/shifts/current`, {
        cookies: repCookies,
      });
      assertStatus(response.status, 200, "shifts/current");
      assertHasData(json, "shifts/current");
    }, results);

    await runCheck("2", "GET /api/v1/knocks/mine", async () => {
      const today = sydneyToday();
      const { response, json } = await fetchJson(
        `${base}/api/v1/knocks/mine?from=${today}&to=${today}`,
        { cookies: repCookies },
      );
      assertStatus(response.status, 200, "knocks/mine");
      assertHasData(json, "knocks/mine");
    }, results);

    if (!process.env.MAPBOX_SECRET_TOKEN?.trim()) {
      skipCheck(
        "2",
        "GET /api/v1/geocode/reverse (Mapbox)",
        "MAPBOX_SECRET_TOKEN not set in .env.local",
        results,
      );
    } else {
      await runCheck("2", "GET /api/v1/geocode/reverse (Mapbox)", async () => {
        const url = `${base}/api/v1/geocode/reverse?lat=-33.8688&lng=151.2093`;
        const { response, json } = await fetchJson(url, { cookies: repCookies });
        assertStatus(response.status, 200, "geocode/reverse");
        assertHasData(json, "geocode/reverse");
      }, results);
    }
  } else {
    skipCheck("2", "Rep map, shift, and knock APIs", "rep credentials not configured", results);
  }

  await runCheck("2", "GET /~offline PWA fallback page loads", async () => {
    const page = await fetchPage(`${base}/~offline`);
    if (page.status !== 200) {
      throw new Error(`expected HTTP 200, got ${page.status}`);
    }
  }, results);

  // ── Epic 3: Manager Field Visibility ───────────────────────────────────
  section("Epic 3 — Manager Field Visibility");

  await runCheck("3", "GET /admin/map page loads", async () => {
    const page = await fetchPage(`${base}/admin/map`, { cookies: adminCookies });
    if (page.status !== 200) {
      throw new Error(`expected HTTP 200, got ${page.status}`);
    }
  }, results);

  await runCheck("3", "GET /api/v1/admin/knocks (bbox filter)", async () => {
    const today = sydneyToday();
    const url = `${base}/api/v1/admin/knocks?bbox=${encodeURIComponent(SYDNEY_BBOX)}&from=${today}&to=${today}`;
    const { response, json } = await fetchJson(url, { cookies: adminCookies });
    assertStatus(response.status, 200, "admin/knocks");
    assertHasData(json, "admin/knocks");
  }, results);

  await runCheck("3", "GET /api/v1/admin/activity (live feed)", async () => {
    const { response, json } = await fetchJson(`${base}/api/v1/admin/activity`, {
      cookies: adminCookies,
    });
    assertStatus(response.status, 200, "admin/activity");
    assertHasData(json, "admin/activity");
    if (!Array.isArray(json.data.items)) {
      throw new Error("admin/activity: data.items should be an array");
    }
  }, results);

  let sampleRepId;
  await runCheck("3", "GET /api/v1/admin/dashboard/summary", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/admin/dashboard/summary`,
      { cookies: adminCookies },
    );
    assertStatus(response.status, 200, "dashboard/summary");
    assertHasData(json, "dashboard/summary");
    if (!Array.isArray(json.data.rows)) {
      throw new Error("dashboard/summary: data.rows should be an array");
    }
    if (json.data.rows.length > 0) {
      sampleRepId = json.data.rows[0].rep_id;
    }
  }, results);

  await runCheck("3", "GET /api/v1/admin/dashboard/low-activity", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/admin/dashboard/low-activity`,
      { cookies: adminCookies },
    );
    assertStatus(response.status, 200, "dashboard/low-activity");
    assertHasData(json, "dashboard/low-activity");
  }, results);

  await runCheck("3", "GET /api/v1/admin/dashboard/morning-overview", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/admin/dashboard/morning-overview`,
      { cookies: adminCookies },
    );
    assertStatus(response.status, 200, "dashboard/morning-overview");
    assertHasData(json, "dashboard/morning-overview");
  }, results);

  await runCheck("3", "GET /api/v1/admin/gps/breadcrumbs", async () => {
    if (!sampleRepId && repEmail) {
      throw new Error("no rep_id from summary grid — create at least one rep profile");
    }
    const repId = sampleRepId ?? "00000000-0000-4000-8000-000000000001";
    const url = `${base}/api/v1/admin/gps/breadcrumbs?rep_id=${repId}&date=${sydneyToday()}`;
    const { response, json } = await fetchJson(url, { cookies: adminCookies });
    assertStatus(response.status, 200, "gps/breadcrumbs");
    assertHasData(json, "gps/breadcrumbs");
  }, results);

  // ── Epic 4: Unified Lead Pipeline ────────────────────────────────────────
  section("Epic 4 — Unified Lead Pipeline");

  await runCheck("4", "GET /api/v1/leads (admin)", async () => {
    const { response, json } = await fetchJson(`${base}/api/v1/leads`, {
      cookies: adminCookies,
    });
    assertStatus(response.status, 200, "leads admin");
    assertHasData(json, "leads admin");
  }, results);

  await runCheck("4", "Admin pipeline pages load", async () => {
    const list = await fetchPage(`${base}/admin/pipeline`, { cookies: adminCookies });
    if (list.status !== 200) {
      throw new Error(`/admin/pipeline: expected HTTP 200, got ${list.status}`);
    }
  }, results);

  if (repCookies) {
    await runCheck("4", "Rep cannot DELETE /api/v1/leads/[id]", async () => {
      const fakeLeadId = "00000000-0000-4000-8000-000000000001";
      const res = await fetch(`${base}/api/v1/leads/${fakeLeadId}`, {
        method: "DELETE",
        headers: { cookie: repCookies },
      });
      if (res.status !== 403 && res.status !== 401) {
        throw new Error(`expected 403/401 for rep delete, got ${res.status}`);
      }
    }, results);
  } else {
    skipCheck(
      "4",
      "Rep cannot DELETE /api/v1/leads/[id]",
      "rep credentials not configured",
      results,
    );
  }

  await runCheck("4", "Admin DELETE /api/v1/leads/[id] returns 404 for missing lead", async () => {
    const fakeLeadId = "00000000-0000-4000-8000-000000000001";
    const res = await fetch(`${base}/api/v1/leads/${fakeLeadId}`, {
      method: "DELETE",
      headers: { cookie: adminCookies },
    });
    if (res.status !== 404) {
      throw new Error(`expected 404 for missing lead delete, got ${res.status}`);
    }
  }, results);

  if (repCookies) {
    await runCheck("4", "GET /api/v1/leads (rep)", async () => {
      const { response, json } = await fetchJson(`${base}/api/v1/leads`, {
        cookies: repCookies,
      });
      assertStatus(response.status, 200, "leads rep");
      assertHasData(json, "leads rep");
    }, results);

    await runCheck("4", "Rep pipeline page loads", async () => {
      const page = await fetchPage(`${base}/rep/pipeline`, { cookies: repCookies });
      if (page.status !== 200) {
        throw new Error(`expected HTTP 200, got ${page.status}`);
      }
    }, results);
  } else {
    skipCheck("4", "Rep pipeline checks", "rep credentials not configured", results);
  }

  // ── Epic 5: Cold Call Tracking ───────────────────────────────────────────
  section("Epic 5 — Cold Call Tracking");

  if (repCookies) {
    await runCheck("5", "GET /rep/calls page loads", async () => {
      const page = await fetchPage(`${base}/rep/calls`, { cookies: repCookies });
      if (page.status !== 200) {
        throw new Error(`expected HTTP 200, got ${page.status}`);
      }
    }, results);

    await runCheck("5", "GET /api/v1/contacts/search", async () => {
      const { response, json } = await fetchJson(
        `${base}/api/v1/contacts/search?q=test`,
        { cookies: repCookies },
      );
      assertStatus(response.status, 200, "contacts/search");
      assertHasData(json, "contacts/search");
      if (!Array.isArray(json.data.contacts)) {
        throw new Error("contacts/search: data.contacts should be an array");
      }
    }, results);

    await runCheck("5", "GET /api/v1/calls/daily-count", async () => {
      const { response, json } = await fetchJson(`${base}/api/v1/calls/daily-count`, {
        cookies: repCookies,
      });
      assertStatus(response.status, 200, "calls/daily-count");
      assertHasData(json, "calls/daily-count");
    }, results);

    await runCheck("5", "GET /api/v1/calls/script", async () => {
      const { response, json } = await fetchJson(`${base}/api/v1/calls/script`, {
        cookies: repCookies,
      });
      assertStatus(response.status, 200, "calls/script");
      assertHasData(json, "calls/script");
    }, results);
  } else {
    skipCheck("5", "Calls panel and APIs", "rep credentials not configured", results);
  }

  // ── Epic 6: Territory Planning & Assignment ──────────────────────────────
  section("Epic 6 — Territory Planning & Assignment");

  await runCheck("6", "GET /admin/territories page loads", async () => {
    const page = await fetchPage(`${base}/admin/territories`, {
      cookies: adminCookies,
    });
    if (page.status !== 200) {
      throw new Error(`expected HTTP 200, got ${page.status}`);
    }
  }, results);

  await runCheck("6", "GET /api/v1/territories (admin)", async () => {
    const { response, json } = await fetchJson(`${base}/api/v1/territories`, {
      cookies: adminCookies,
    });
    assertStatus(response.status, 200, "territories");
    assertHasData(json, "territories");
  }, results);

  await runCheck("6", "GET /api/v1/territory-assignments", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/territory-assignments`,
      { cookies: adminCookies },
    );
    assertStatus(response.status, 200, "territory-assignments");
    assertHasData(json, "territory-assignments");
  }, results);

  if (repCookies) {
    await runCheck("6", "GET /api/v1/territories/mine (rep)", async () => {
      const { response, json } = await fetchJson(`${base}/api/v1/territories/mine`, {
        cookies: repCookies,
      });
      assertStatus(response.status, 200, "territories/mine");
      assertHasData(json, "territories/mine");
    }, results);

    await runCheck("6", "Rep cannot POST /api/v1/territories", async () => {
      const { response } = await fetchJson(`${base}/api/v1/territories`, {
        cookies: repCookies,
        method: "POST",
        body: { name: "smoke-test", geometry: null },
      });
      if (response.status !== 403 && response.status !== 401) {
        throw new Error(`expected 401/403 for rep territory create, got ${response.status}`);
      }
    }, results);
  } else {
    skipCheck("6", "Rep territory overlay checks", "rep credentials not configured", results);
  }

  // ── Epic 7: Sales Intelligence Dashboard ─────────────────────────────────
  section("Epic 7 — Sales Intelligence Dashboard");

  await runCheck("7", "GET /api/v1/admin/dashboard/funnel", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/admin/dashboard/funnel`,
      { cookies: adminCookies },
    );
    assertStatus(response.status, 200, "dashboard/funnel");
    assertHasData(json, "dashboard/funnel");
  }, results);

  await runCheck("7", "GET /api/v1/admin/dashboard/geographic-yield", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/admin/dashboard/geographic-yield`,
      { cookies: adminCookies },
    );
    assertStatus(response.status, 200, "dashboard/geographic-yield");
    assertHasData(json, "dashboard/geographic-yield");
  }, results);

  await runCheck("7", "GET /api/v1/admin/dashboard/activity-trend", async () => {
    const weekFrom = new Date();
    weekFrom.setDate(weekFrom.getDate() - weekFrom.getDay());
    const weekTo = new Date(weekFrom);
    weekTo.setDate(weekFrom.getDate() + 6);
    const fmt = (d) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(d);
    const { response, json } = await fetchJson(
      `${base}/api/v1/admin/dashboard/activity-trend?from=${fmt(weekFrom)}&to=${fmt(weekTo)}`,
      { cookies: adminCookies },
    );
    assertStatus(response.status, 200, "dashboard/activity-trend");
    assertHasData(json, "dashboard/activity-trend");
    if (!Array.isArray(json.data.days)) {
      throw new Error("dashboard/activity-trend: data.days should be an array");
    }
  }, results);

  await runCheck("7", "GET /api/v1/admin/calls/script (admin settings)", async () => {
    const { response, json } = await fetchJson(`${base}/api/v1/admin/calls/script`, {
      cookies: adminCookies,
    });
    assertStatus(response.status, 200, "admin/calls/script");
    assertHasData(json, "admin/calls/script");
  }, results);

  if (sampleRepId) {
    await runCheck("7", "GET /api/v1/admin/reps/[repId]/activity-trend", async () => {
      const { response, json } = await fetchJson(
        `${base}/api/v1/admin/reps/${sampleRepId}/activity-trend`,
        { cookies: adminCookies },
      );
      assertStatus(response.status, 200, "rep activity-trend");
      assertHasData(json, "rep activity-trend");
    }, results);

    await runCheck("7", "GET /api/v1/admin/reps/[repId]/pipeline", async () => {
      const { response, json } = await fetchJson(
        `${base}/api/v1/admin/reps/${sampleRepId}/pipeline`,
        { cookies: adminCookies },
      );
      assertStatus(response.status, 200, "rep pipeline snapshot");
      assertHasData(json, "rep pipeline snapshot");
    }, results);

    await runCheck("7", "GET /admin/reps/[repId] deep-dive page loads", async () => {
      const page = await fetchPage(`${base}/admin/reps/${sampleRepId}`, {
        cookies: adminCookies,
      });
      if (page.status !== 200) {
        throw new Error(`expected HTTP 200, got ${page.status}`);
      }
    }, results);
  } else {
    skipCheck(
      "7",
      "Rep deep-dive APIs and page",
      "no reps in summary grid — create a rep via /admin/team",
      results,
    );
  }

  // ── Epic 8: Mobile — Notifications, History & APK (API) ─────────────────
  section("Epic 8 — Mobile: Notifications, History & APK (API)");

  if (repCookies) {
    const today = sydneyToday();
    const historyQuery = `from=${today}&to=${today}&limit=10&offset=0`;

    await runCheck("8", "GET /api/v1/calls/mine", async () => {
      const { response, json } = await fetchJson(
        `${base}/api/v1/calls/mine?${historyQuery}`,
        { cookies: repCookies },
      );
      assertStatus(response.status, 200, "calls/mine");
      assertHasData(json, "calls/mine");
      if (!Array.isArray(json.data.calls)) {
        throw new Error("calls/mine: data.calls should be an array");
      }
      if (typeof json.data.truncated !== "boolean") {
        throw new Error("calls/mine: data.truncated should be boolean");
      }
    }, results);

    let repBearer = null;
    try {
      repBearer = await signInRepBearer();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      results.push({
        epic: "8",
        name: "Rep Bearer sign-in",
        ok: false,
        detail,
      });
      console.log("  ✗ Rep Bearer sign-in");
      console.log(`    → ${detail}`);
    }

    if (repBearer) {
      await runCheck("8", "GET /api/v1/calls/mine (Bearer)", async () => {
        const { response, json } = await fetchJson(
          `${base}/api/v1/calls/mine?${historyQuery}`,
          { headers: { Authorization: `Bearer ${repBearer}` } },
        );
        assertStatus(response.status, 200, "calls/mine Bearer");
        assertHasData(json, "calls/mine Bearer");
      }, results);

      await runCheck("8", "GET /api/v1/knocks/mine (Bearer)", async () => {
        const { response, json } = await fetchJson(
          `${base}/api/v1/knocks/mine?${historyQuery}`,
          { headers: { Authorization: `Bearer ${repBearer}` } },
        );
        assertStatus(response.status, 200, "knocks/mine Bearer");
        assertHasData(json, "knocks/mine Bearer");
      }, results);

      const smokeExpoToken = `ExponentPushToken[smoke-${Date.now().toString(36)}]`;

      await runCheck("8", "POST /api/v1/push/subscribe (expo)", async () => {
        const { response, json } = await fetchJson(`${base}/api/v1/push/subscribe`, {
          method: "POST",
          headers: { Authorization: `Bearer ${repBearer}` },
          body: {
            platform: "expo",
            expo_push_token: smokeExpoToken,
          },
        });
        assertStatus(response.status, 200, "push/subscribe expo");
        assertHasData(json, "push/subscribe expo");
        if (json.data?.subscribed !== true) {
          throw new Error("push/subscribe: expected subscribed: true");
        }
      }, results);

      await runCheck("8", "DELETE /api/v1/push/subscribe (expo cleanup)", async () => {
        const { response, json } = await fetchJson(`${base}/api/v1/push/subscribe`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${repBearer}` },
          body: { endpoint: smokeExpoToken },
        });
        assertStatus(response.status, 200, "push/unsubscribe expo");
        assertHasData(json, "push/unsubscribe expo");
      }, results);
    } else if (!results.some((r) => r.epic === "8" && r.name === "Rep Bearer sign-in" && !r.ok)) {
      skipCheck(
        "8",
        "Bearer + expo push checks",
        "set TEST_REP_* and Supabase public env vars",
        results,
      );
    }
  } else {
    skipCheck(
      "8",
      "Mobile history and push APIs",
      "rep credentials not configured",
      results,
    );
  }

  const failed = printSummary(results);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("");
  console.error("Smoke test crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
