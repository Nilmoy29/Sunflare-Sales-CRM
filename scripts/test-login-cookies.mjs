import { loadEnvLocal, loginWithForm, fetchPage } from "./lib/smoke-utils.mjs";

loadEnvLocal();

const email = process.env.TEST_LOGIN_EMAIL ?? "admin+sunflare@test.com";
const password = process.env.TEST_LOGIN_PASSWORD;

if (!password) {
  console.error("Set TEST_LOGIN_PASSWORD in .env.local to run this script.");
  process.exit(1);
}

const base = process.env.TEST_LOGIN_BASE ?? process.env.TEST_SMOKE_BASE ?? "http://localhost:3000";

const { cookies, redirectLocation } = await loginWithForm(base, email, password);

console.log("POST /api/auth/login — session cookies set");
console.log("Redirect:", redirectLocation);

const dash = await fetchPage(`${base}/admin/dashboard`, { cookies });

console.log("GET /admin/dashboard", dash.status);
console.log("Location:", dash.location);

if (dash.status !== 200) {
  process.exit(1);
}
