import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** @typedef {{ name: string; epic: string; ok: boolean; detail?: string; skipped?: boolean }} SmokeResult */

/**
 * Load `.env.local` into `process.env` (does not override existing vars).
 */
export function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const hash = value.indexOf(" #");
    if (hash !== -1) {
      value = value.slice(0, hash).trim();
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

/** Trim and validate credential strings from env. */
export function envCredential(value, label) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes("#")) {
    throw new Error(
      `${label} looks malformed (inline comment?). Use only the value, e.g. TEST_REP_EMAIL=rep@test.com`,
    );
  }
  return trimmed;
}

/**
 * Rep JWT for mobile Bearer API smoke checks (Epic 8).
 * @returns {Promise<string | null>}
 */
export async function signInRepBearer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const repEmail = envCredential(process.env.TEST_REP_EMAIL, "TEST_REP_EMAIL");
  const repPassword = envCredential(
    process.env.TEST_REP_PASSWORD,
    "TEST_REP_PASSWORD",
  );

  if (!supabaseUrl || !anonKey || !repEmail || !repPassword) {
    return null;
  }

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
    throw new Error(`Supabase rep sign-in failed (${res.status})`);
  }

  const json = await res.json();
  if (!json.access_token) {
    throw new Error("No access_token in rep sign-in response");
  }

  return json.access_token;
}

/** Sydney calendar date as YYYY-MM-DD (matches server validators). */
export function sydneyToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
  }).format(new Date());
}

/** Default Mapbox bbox for Sydney CBD: west,south,east,north */
export const SYDNEY_BBOX = "151.18,-33.89,151.24,-33.85";

/**
 * @param {Response} response
 * @returns {string}
 */
export function cookiesFromResponse(response) {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  if (setCookies.length > 0) {
    return setCookies.map((c) => c.split(";")[0]).join("; ");
  }
  const raw = response.headers.get("set-cookie");
  if (!raw) return "";
  return raw
    .split(/,(?=[^;]+=[^;]+)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");
}

/**
 * @param {string} base
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ cookies: string; redirectLocation: string | null }>}
 */
export async function loginWithForm(base, email, password) {
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);

  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    body: form,
    redirect: "manual",
  });

  const cookies = cookiesFromResponse(response);
  if (!cookies) {
    throw new Error(
      `Login failed for ${email}: HTTP ${response.status}, no session cookies`,
    );
  }

  return {
    cookies,
    redirectLocation: response.headers.get("location"),
  };
}

/**
 * @param {string} url
 * @param {{ cookies?: string; method?: string; body?: unknown; headers?: Record<string, string> }} [options]
 */
export async function fetchJson(url, options = {}) {
  const { cookies, method = "GET", body, headers = {} } = options;
  const init = {
    method,
    headers: {
      ...(cookies ? { cookie: cookies } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    redirect: "manual",
  };
  if (body) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { response, json, text };
}

/**
 * @param {string} url
 * @param {{ cookies?: string }} [options]
 */
/**
 * Fetch an HTML page and follow redirects (e.g. Next.js RSC redirects).
 * @param {string} url
 * @param {{ cookies?: string; maxRedirects?: number }} [options]
 */
export async function fetchPage(url, options = {}) {
  const { cookies, maxRedirects = 5 } = options;
  let currentUrl = url;
  let cookieHeader = cookies ?? "";

  for (let i = 0; i <= maxRedirects; i++) {
    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });

    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];
    if (setCookies.length > 0) {
      const jar = new Map();
      if (cookieHeader) {
        for (const part of cookieHeader.split("; ")) {
          const eq = part.indexOf("=");
          if (eq !== -1) jar.set(part.slice(0, eq), part.slice(eq + 1));
        }
      }
      for (const c of setCookies) {
        const pair = c.split(";")[0];
        const eq = pair.indexOf("=");
        if (eq !== -1) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
      }
      cookieHeader = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    }

    const location = response.headers.get("location");
    const isRedirect =
      response.status === 301 ||
      response.status === 302 ||
      response.status === 303 ||
      response.status === 307 ||
      response.status === 308;

    if (isRedirect && location && i < maxRedirects) {
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    return {
      status: response.status,
      location,
      url: currentUrl,
      cookies: cookieHeader,
      ok: response.ok,
    };
  }

  throw new Error(`Too many redirects for ${url}`);
}

/**
 * Single-hop fetch (no redirect follow) for auth/middleware checks.
 * @param {string} url
 * @param {{ cookies?: string }} [options]
 */
export async function fetchOnce(url, options = {}) {
  const { cookies } = options;
  const response = await fetch(url, {
    redirect: "manual",
    headers: cookies ? { cookie: cookies } : {},
  });
  return {
    status: response.status,
    location: response.headers.get("location"),
    url,
  };
}

/**
 * @param {string} epic
 * @param {string} name
 * @param {() => Promise<void>} fn
 * @param {SmokeResult[]} results
 */
export async function runCheck(epic, name, fn, results) {
  try {
    await fn();
    results.push({ epic, name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ epic, name, ok: false, detail });
    console.log(`  ✗ ${name}`);
    console.log(`    → ${detail}`);
  }
}

/**
 * @param {string} epic
 * @param {string} name
 * @param {string} reason
 * @param {SmokeResult[]} results
 */
export function skipCheck(epic, name, reason, results) {
  results.push({ epic, name, ok: true, skipped: true, detail: reason });
  console.log(`  ○ ${name} (skipped: ${reason})`);
}

export function assertStatus(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, got ${actual}`);
  }
}

export function assertHasData(json, label) {
  if (!json || typeof json !== "object" || !("data" in json)) {
    throw new Error(`${label}: response missing { data } envelope`);
  }
}

export function assertNoError(json, label) {
  if (json && typeof json === "object" && "error" in json) {
    const err = json.error;
    const msg =
      err && typeof err === "object" && "message" in err
        ? err.message
        : JSON.stringify(err);
    throw new Error(`${label}: API error — ${msg}`);
  }
}

export function printSummary(results) {
  const passed = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `Smoke summary: ${passed} passed, ${failed} failed, ${skipped} skipped`,
  );

  if (failed > 0) {
    console.log("");
    console.log("Failures:");
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  [Epic ${r.epic}] ${r.name}: ${r.detail ?? "failed"}`);
    }
  }

  return failed;
}
