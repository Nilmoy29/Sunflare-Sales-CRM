#!/usr/bin/env node
/**
 * Targeted verification for admin dashboard v2 + mobile map changes.
 */
import {
  assertHasData,
  assertStatus,
  envCredential,
  fetchJson,
  loadEnvLocal,
  loginWithForm,
  printSummary,
  runCheck,
} from "./lib/smoke-utils.mjs";

loadEnvLocal();

const base = process.env.TEST_SMOKE_BASE ?? "http://localhost:3000";
const adminEmail = envCredential(
  process.env.TEST_LOGIN_EMAIL ?? "admin+sunflare@test.com",
  "TEST_LOGIN_EMAIL",
);
const adminPassword = envCredential(process.env.TEST_LOGIN_PASSWORD, "TEST_LOGIN_PASSWORD");

/** @type {import("./lib/smoke-utils.mjs").SmokeResult[]} */
const results = [];

function weekRange() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
  }).format(new Date());
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Australia/Sydney",
    weekday: "short",
  }).format(new Date());
  const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = map[weekday] ?? 0;
  const start = new Date(
    new Date(`${today}T12:00:00+10:00`).getTime() - offset * 86400000,
  );
  const end = new Date(start.getTime() + 6 * 86400000);
  const fmt = (d) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(d);
  return { from: fmt(start), to: fmt(end) };
}

async function fetchHtml(url, cookies) {
  const response = await fetch(url, {
    headers: cookies ? { cookie: cookies } : {},
  });
  return {
    status: response.status,
    html: await response.text(),
  };
}

async function main() {
  if (!adminPassword) {
    console.error("Set TEST_LOGIN_PASSWORD in .env.local");
    process.exit(1);
  }

  console.log(`Admin dashboard v2 checks → ${base}`);

  const login = await loginWithForm(base, adminEmail, adminPassword);
  const adminCookies = login.cookies;

  const { from, to } = weekRange();

  await runCheck(
    "v2",
    "GET /api/v1/admin/dashboard/activity-trend returns weekly days",
    async () => {
      const { response, json } = await fetchJson(
        `${base}/api/v1/admin/dashboard/activity-trend?from=${from}&to=${to}`,
        { cookies: adminCookies },
      );
      assertStatus(response.status, 200, "activity-trend");
      assertHasData(json, "activity-trend");
      if (!Array.isArray(json.data.days)) {
        throw new Error("activity-trend: data.days should be an array");
      }
      if (json.data.days.length !== 7) {
        throw new Error(
          `activity-trend: expected 7 days for week range, got ${json.data.days.length}`,
        );
      }
      const sample = json.data.days[0];
      for (const key of [
        "activity_date",
        "doors",
        "calls",
        "leads_added",
        "appointments_set",
      ]) {
        if (!(key in sample)) {
          throw new Error(`activity-trend day missing field: ${key}`);
        }
      }
    },
    results,
  );

  await runCheck(
    "v2",
    "GET /admin/dashboard renders new layout (no removed panels)",
    async () => {
      const page = await fetchHtml(`${base}/admin/dashboard`, adminCookies);
      if (page.status !== 200) {
        throw new Error(`expected HTTP 200, got ${page.status}`);
      }
      const html = page.html;
      const required = ["Team activity", "Top performers", "Recent activity"];
      for (const text of required) {
        if (!html.includes(text)) {
          throw new Error(`dashboard missing: ${text}`);
        }
      }
      const removed = ["Morning overview", "Needs attention", "Funnel conversion"];
      for (const text of removed) {
        if (html.includes(text)) {
          throw new Error(`dashboard should not include: ${text}`);
        }
      }
    },
    results,
  );

  await runCheck(
    "v2",
    "Admin map + territories pages load",
    async () => {
      for (const path of ["/admin/map", "/admin/territories"]) {
        const page = await fetchHtml(`${base}${path}`, adminCookies);
        if (page.status !== 200) {
          throw new Error(`${path}: expected HTTP 200, got ${page.status}`);
        }
        if (!page.html.includes("mapbox") && !page.html.includes("Mapbox")) {
          // Mapbox chunks may be lazy-loaded; ensure page shell rendered
          if (
            !page.html.includes("Global map") &&
            !page.html.includes("Territories")
          ) {
            throw new Error(`${path}: expected page content`);
          }
        }
      }
    },
    results,
  );

  await runCheck(
    "v2",
    "Map pages include mobile-friendly map container classes",
    async () => {
      for (const path of ["/admin/map", "/admin/territories"]) {
        const page = await fetchHtml(`${base}${path}`, adminCookies);
        if (!page.html.includes("50dvh") && !page.html.includes("min-h-[300px]")) {
          throw new Error(`${path}: missing mobile map viewport height classes`);
        }
      }
    },
    results,
  );

  const failed = printSummary(results);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Verification crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
