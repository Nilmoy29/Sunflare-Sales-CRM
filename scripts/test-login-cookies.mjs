import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const email = process.env.TEST_LOGIN_EMAIL ?? "admin+sunflare@test.com";
const password = process.env.TEST_LOGIN_PASSWORD;

if (!password) {
  console.error("Set TEST_LOGIN_PASSWORD in .env.local to run this script.");
  process.exit(1);
}

const base = process.env.TEST_LOGIN_BASE ?? "http://localhost:3000";

const form = new FormData();
form.set("email", email);
form.set("password", password);

const loginRes = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  body: form,
  redirect: "manual",
});

console.log("POST /api/auth/login", loginRes.status);
console.log(
  "Set-Cookie headers:",
  loginRes.headers.getSetCookie?.() ?? loginRes.headers.get("set-cookie"),
);

const cookieHeader = (loginRes.headers.getSetCookie?.() ?? [])
  .map((c) => c.split(";")[0])
  .join("; ");

if (!cookieHeader) {
  console.error("No Set-Cookie on login response — server-side login is broken.");
  process.exit(1);
}

const dashRes = await fetch(`${base}/admin/dashboard`, {
  redirect: "manual",
  headers: { cookie: cookieHeader },
});

console.log("GET /admin/dashboard", dashRes.status);
console.log("Location:", dashRes.headers.get("location"));
