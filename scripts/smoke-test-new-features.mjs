#!/usr/bin/env node
/**
 * Smoke test for new lead booking, pipeline table, and editable lead detail flows.
 *
 * Prerequisites:
 *   - Dev server running (default http://localhost:3000)
 *   - `.env.local` with Supabase keys + test credentials
 *
 * Env: same as scripts/smoke-test.mjs (TEST_LOGIN_*, TEST_REP_*, TEST_SMOKE_BASE)
 */

import {
  assertHasData,
  assertNoError,
  assertStatus,
  envCredential,
  fetchJson,
  fetchPage,
  loadEnvLocal,
  loginWithForm,
  printSummary,
  runCheck,
  skipCheck,
  sydneyToday,
} from "./lib/smoke-utils.mjs";

loadEnvLocal();

const base = process.env.TEST_SMOKE_BASE ?? "http://localhost:3000";
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

function tomorrowAppointmentIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(14, 30, 0, 0);
  return d.toISOString();
}

function uniqueSuffix() {
  return Date.now().toString(36);
}

async function ensureRepShift(repCookies) {
  const { response, json } = await fetchJson(`${base}/api/v1/shifts/current`, {
    cookies: repCookies,
  });
  assertStatus(response.status, 200, "shifts/current");
  if (json.data?.shift?.id) {
    return json.data.shift.id;
  }

  const start = await fetchJson(`${base}/api/v1/shifts/start`, {
    cookies: repCookies,
    method: "POST",
  });
  if (start.response.status === 409) {
    const again = await fetchJson(`${base}/api/v1/shifts/current`, {
      cookies: repCookies,
    });
    if (again.json.data?.shift?.id) {
      return again.json.data.shift.id;
    }
  }
  assertStatus(start.response.status, 200, "shifts/start");
  assertHasData(start.json, "shifts/start");
  return start.json.data.id;
}

async function main() {
  console.log(`Sunflare new-features smoke test → ${base}`);

  if (!adminPassword) {
    console.error("Set TEST_LOGIN_PASSWORD in .env.local");
    process.exit(1);
  }
  if (!repEmail || !repPassword) {
    console.error("Set TEST_REP_EMAIL and TEST_REP_PASSWORD in .env.local");
    process.exit(1);
  }

  let adminCookies;
  let repCookies;

  section("Auth");

  await runCheck("NF", "Admin login", async () => {
    const login = await loginWithForm(base, adminEmail, adminPassword);
    adminCookies = login.cookies;
  }, results);

  await runCheck("NF", "Rep login", async () => {
    const login = await loginWithForm(base, repEmail, repPassword);
    repCookies = login.cookies;
  }, results);

  section("Book appointment (+ lead flow)");

  await runCheck("NF", "POST book-appointment without shift is blocked when no shift", async () => {
    const end = await fetchJson(`${base}/api/v1/shifts/end`, {
      cookies: repCookies,
      method: "POST",
    });
    if (end.response.status === 200) {
      // ended existing shift
    }

    const { response } = await fetchJson(`${base}/api/v1/knocks/book-appointment`, {
      cookies: repCookies,
      method: "POST",
      body: {
        lat: -42.8821,
        lng: 147.3272,
        customer_name: "Smoke Test",
        phone: "0400000001",
        appointment_at: tomorrowAppointmentIso(),
        closer_name: "Smoke Closer",
        notes: "smoke test booking",
        address: "1 Smoke Test St",
        suburb: "Hobart",
        postcode: "7000",
      },
    });
    if (response.status !== 403) {
      throw new Error(`expected 403 without active shift, got ${response.status}`);
    }
  }, results);

  let bookedLeadId;
  let bookedContactId;
  const smokeName = `Smoke Customer ${uniqueSuffix()}`;

  await runCheck("NF", "Rep starts shift", async () => {
    await ensureRepShift(repCookies);
  }, results);

  await runCheck("NF", "POST /api/v1/knocks/book-appointment creates lead", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/knocks/book-appointment`,
      {
        cookies: repCookies,
        method: "POST",
        body: {
          lat: -42.8821,
          lng: 147.3272,
          customer_name: smokeName,
          phone: "0400111222",
          appointment_at: tomorrowAppointmentIso(),
          closer_name: "Test Closer",
          notes: "Gate code 1234",
          address: "99 Smoke Test Ave",
          suburb: "Hobart",
          postcode: "7000",
        },
      },
    );
    assertStatus(response.status, 200, "book-appointment");
    assertHasData(json, "book-appointment");
    assertNoError(json, "book-appointment");

    if (!json.data.knock_id) {
      throw new Error("book-appointment: missing knock_id");
    }
    if (!json.data.lead?.id) {
      throw new Error("book-appointment: missing lead.id");
    }
    if (json.data.lead.stage !== "appointment_set") {
      throw new Error(
        `book-appointment: expected stage appointment_set, got ${json.data.lead.stage}`,
      );
    }
    if (json.data.lead.source !== "d2d") {
      throw new Error(`book-appointment: expected source d2d, got ${json.data.lead.source}`);
    }

    bookedLeadId = json.data.lead.id;
  }, results);

  section("Pipeline table data");

  await runCheck("NF", "GET /api/v1/leads returns enriched lead card fields", async () => {
    const today = sydneyToday();
    const { response, json } = await fetchJson(
      `${base}/api/v1/leads?from=${today}&to=${today}`,
      { cookies: adminCookies },
    );
    assertStatus(response.status, 200, "leads");
    assertHasData(json, "leads");

    const lead = json.data.leads.find((item) => item.id === bookedLeadId);
    if (!lead) {
      throw new Error(`booked lead ${bookedLeadId} not found in pipeline list`);
    }
    if (lead.contact_name !== smokeName) {
      throw new Error(
        `contact_name expected "${smokeName}", got "${lead.contact_name}"`,
      );
    }
    if (lead.phone !== "0400111222") {
      throw new Error(`phone expected 0400111222, got ${lead.phone}`);
    }
    if (!lead.booked_at) {
      throw new Error("booked_at should be set from appointment follow-up");
    }
    if (lead.stage !== "appointment_set") {
      throw new Error(`stage expected appointment_set, got ${lead.stage}`);
    }
    if (!("latest_note" in lead)) {
      throw new Error("pipeline lead missing latest_note field");
    }
    if (!("proposal_sent_at" in lead)) {
      throw new Error("pipeline lead missing proposal_sent_at field");
    }
  }, results);

  section("Editable lead detail + contact CRUD");

  await runCheck("NF", "GET /api/v1/leads/[id] returns editable contact fields", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/leads/${bookedLeadId}`,
      { cookies: adminCookies },
    );
    assertStatus(response.status, 200, "lead detail");
    assertHasData(json, "lead detail");

    const lead = json.data.lead;
    if (!lead.contact_id) {
      throw new Error("lead detail missing contact_id");
    }
    if (lead.first_name !== smokeName) {
      throw new Error(`first_name expected "${smokeName}", got "${lead.first_name}"`);
    }
    if (lead.address !== "99 Smoke Test Ave") {
      throw new Error(`address mismatch: ${lead.address}`);
    }
    if (lead.suburb !== "Hobart") {
      throw new Error(`suburb mismatch: ${lead.suburb}`);
    }
    if (lead.postcode !== "7000") {
      throw new Error(`postcode mismatch: ${lead.postcode}`);
    }

    bookedContactId = lead.contact_id;

    const followUp = json.data.timeline.find((item) => item.kind === "follow_up");
    if (!followUp) {
      throw new Error("lead detail timeline missing follow_up from booking");
    }
    if (!followUp.note.includes("Closer: Test Closer")) {
      throw new Error(`follow_up note missing closer info: ${followUp.note}`);
    }
  }, results);

  const updatedName = `${smokeName} Updated`;

  await runCheck("NF", "PATCH /api/v1/contacts/[id] updates customer (rep)", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/contacts/${bookedContactId}`,
      {
        cookies: repCookies,
        method: "PATCH",
        body: {
          first_name: updatedName,
          last_name: null,
          phone: "0400333444",
          address: "100 Updated St",
          suburb: "Hobart",
          postcode: "7001",
        },
      },
    );
    assertStatus(response.status, 200, "contact update rep");
    assertHasData(json, "contact update rep");
    if (json.data.contact.first_name !== updatedName) {
      throw new Error("contact first_name not updated");
    }
    if (json.data.contact.phone !== "0400333444") {
      throw new Error("contact phone not updated");
    }
  }, results);

  await runCheck("NF", "PATCH /api/v1/contacts/[id] rejects empty name", async () => {
    const { response } = await fetchJson(
      `${base}/api/v1/contacts/${bookedContactId}`,
      {
        cookies: adminCookies,
        method: "PATCH",
        body: { first_name: "   " },
      },
    );
    if (response.status !== 400) {
      throw new Error(`expected 400 for empty name, got ${response.status}`);
    }
  }, results);

  await runCheck("NF", "PATCH /api/v1/leads/[id]/stage updates status", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/leads/${bookedLeadId}/stage`,
      {
        cookies: adminCookies,
        method: "PATCH",
        body: { stage: "pitched" },
      },
    );
    assertStatus(response.status, 200, "stage update");
    assertHasData(json, "stage update");
    if (json.data.lead.stage !== "pitched") {
      throw new Error(`expected pitched, got ${json.data.lead.stage}`);
    }
  }, results);

  await runCheck("NF", "POST /api/v1/leads/[id]/notes adds note", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/leads/${bookedLeadId}/notes`,
      {
        cookies: adminCookies,
        method: "POST",
        body: { content: "Smoke test note from pipeline" },
      },
    );
    assertStatus(response.status, 200, "add note");
    assertHasData(json, "add note");
    if (!json.data.note?.content?.includes("Smoke test note")) {
      throw new Error("note content missing in response");
    }
  }, results);

  await runCheck("NF", "Pipeline reflects note and stage after updates", async () => {
    const today = sydneyToday();
    const { response, json } = await fetchJson(
      `${base}/api/v1/leads?from=${today}&to=${today}`,
      { cookies: adminCookies },
    );
    assertStatus(response.status, 200, "leads refresh");
    const lead = json.data.leads.find((item) => item.id === bookedLeadId);
    if (!lead) {
      throw new Error("updated lead not in pipeline");
    }
    if (lead.contact_name !== updatedName) {
      throw new Error(`pipeline still shows old name: ${lead.contact_name}`);
    }
    if (lead.stage !== "pitched") {
      throw new Error(`pipeline stage expected pitched, got ${lead.stage}`);
    }
    if (!lead.latest_note?.includes("Smoke test note")) {
      throw new Error(`latest_note not updated: ${lead.latest_note}`);
    }
  }, results);

  await runCheck("NF", "PATCH stage to proposal_sent for Mark sent flow", async () => {
    const { response, json } = await fetchJson(
      `${base}/api/v1/leads/${bookedLeadId}/stage`,
      {
        cookies: adminCookies,
        method: "PATCH",
        body: { stage: "proposal_sent" },
      },
    );
    assertStatus(response.status, 200, "proposal_sent stage");
    if (json.data.lead.stage !== "proposal_sent") {
      throw new Error("stage not proposal_sent");
    }
  }, results);

  section("UI pages");

  await runCheck("NF", "Admin pipeline page loads", async () => {
    const page = await fetchPage(`${base}/admin/pipeline`, { cookies: adminCookies });
    if (page.status !== 200) {
      throw new Error(`expected 200, got ${page.status}`);
    }
  }, results);

  await runCheck("NF", "Rep pipeline page loads", async () => {
    const page = await fetchPage(`${base}/rep/pipeline`, { cookies: repCookies });
    if (page.status !== 200) {
      throw new Error(`expected 200, got ${page.status}`);
    }
  }, results);

  await runCheck("NF", "Admin lead detail page loads", async () => {
    const page = await fetchPage(`${base}/admin/pipeline/${bookedLeadId}`, {
      cookies: adminCookies,
    });
    if (page.status !== 200) {
      throw new Error(`expected 200, got ${page.status}`);
    }
  }, results);

  await runCheck("NF", "Rep lead detail page loads", async () => {
    const page = await fetchPage(`${base}/rep/pipeline/${bookedLeadId}`, {
      cookies: repCookies,
    });
    if (page.status !== 200) {
      throw new Error(`expected 200, got ${page.status}`);
    }
  }, results);

  await runCheck("NF", "Rep map page loads", async () => {
    const page = await fetchPage(`${base}/rep/map`, { cookies: repCookies });
    if (page.status !== 200) {
      throw new Error(`expected 200, got ${page.status}`);
    }
  }, results);

  section("Cleanup");

  await runCheck("NF", "Admin deletes smoke-test lead", async () => {
    const res = await fetch(`${base}/api/v1/leads/${bookedLeadId}`, {
      method: "DELETE",
      headers: { cookie: adminCookies },
    });
    if (res.status !== 200) {
      throw new Error(`expected 200 on delete, got ${res.status}`);
    }
  }, results);

  const failed = printSummary(results);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("");
  console.error("Smoke test crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
