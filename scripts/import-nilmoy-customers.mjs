#!/usr/bin/env node
/**
 * One-off import: Azmain Nilmoy customer CSV → Sunflare CRM (rep Nilmoy).
 *
 * Usage:
 *   node scripts/import-nilmoy-customers.mjs "/path/to/Azmain Nilmoy - Customer.csv"
 *
 * Idempotent via door_knocks.idempotency_key = csv-nilmoy-customer-{row}.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/smoke-utils.mjs";

loadEnvLocal();

const REP_ID = "b1ff9bce-740c-4a27-a937-c13b54b32afa";
const DEFAULT_LAT = -42.8821;
const DEFAULT_LNG = 147.3272;

const STAGE_ORDER = [
  "knocked_called",
  "interested",
  "appointment_set",
  "pitched",
  "proposal_sent",
  "signed",
  "lost",
];

/** @param {string} status */
function mapStatus(status) {
  const s = (status ?? "").trim().toUpperCase();
  switch (s) {
    case "SOLD":
      return { stage: "signed", lostReason: null, doorOutcome: "interested", callOutcome: "answered_interested" };
    case "QUOTATION":
      return { stage: "proposal_sent", lostReason: null, doorOutcome: "interested", callOutcome: "answered_interested" };
    case "NOT INTERESTED":
      return { stage: "lost", lostReason: "not_interested", doorOutcome: "not_interested", callOutcome: "answered_not_interested" };
    case "NO CONSULT":
      return { stage: "appointment_set", lostReason: null, doorOutcome: "not_home", callOutcome: "no_answer" };
    case "CALL":
      return { stage: "interested", lostReason: null, doorOutcome: "callback_requested", callOutcome: "callback_scheduled" };
    case "NOT NOW":
      return { stage: "interested", lostReason: null, doorOutcome: "callback_requested", callOutcome: "callback_scheduled" };
    default:
      return { stage: "interested", lostReason: null, doorOutcome: "interested", callOutcome: "answered_interested" };
  }
}

/** @param {string} status */
function isCallSource(status) {
  return (status ?? "").trim().toUpperCase() === "CALL";
}

/** @param {string} raw */
function normalizePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

/** @param {string} raw */
function normalizeText(raw) {
  return (raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @param {string} ddmmyyyy @param {string} time */
function parseDateTime(ddmmyyyy, time) {
  const d = (ddmmyyyy ?? "").trim();
  if (!d) return null;
  const m = d.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, day, month, year] = m;
  let hours = 9;
  let minutes = 0;
  const t = (time ?? "").trim().toLowerCase();
  const tm = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (tm) {
    hours = Number(tm[1]);
    minutes = Number(tm[2]);
    const meridiem = tm[3];
    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
  }
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+10:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Parse CSV with quoted fields */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
  }
  return rows;
}

/** @param {string} name */
function splitName(name) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { firstName: null, lastName: null };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** @param {string} a @param {string} b */
function addressMatches(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  const numA = na.match(/^\d+/)?.[0];
  const numB = nb.match(/^\d+/)?.[0];
  if (numA && numB && numA === numB) {
    const streetA = na.replace(/^\d+\s*/, "").slice(0, 12);
    const streetB = nb.replace(/^\d+\s*/, "").slice(0, 12);
    return streetA === streetB || na.includes(streetB) || nb.includes(streetA);
  }
  return na === nb || na.includes(nb) || nb.includes(na);
}

/** @param {string} stageA @param {string} stageB */
function pickStage(stageA, stageB) {
  const ia = STAGE_ORDER.indexOf(stageA);
  const ib = STAGE_ORDER.indexOf(stageB);
  if (stageA === "lost" && stageB !== "lost") return stageB;
  if (stageB === "lost" && stageA !== "lost") return stageA;
  return ia >= ib ? stageA : stageB;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: node scripts/import-nilmoy-customers.mjs <csv-path>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const raw = readFileSync(csvPath, "utf8");
  const rows = parseCsv(raw);
  const dataRows = rows.slice(1);

  const { data: existingContacts, error: fetchErr } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, address, postcode, email, lat, lng")
    .eq("created_by", REP_ID);

  if (fetchErr) throw fetchErr;

  const { data: existingLeads, error: leadsErr } = await supabase
    .from("leads")
    .select("id, contact_id, stage, source, door_knock_id, call_log_id")
    .eq("rep_id", REP_ID);

  if (leadsErr) throw leadsErr;

  const leadsByContact = new Map(
    (existingLeads ?? []).map((l) => [l.contact_id, l]),
  );

  /** @type {{ row: number; action: string; name: string; leadStage: string }[]} */
  const summary = [];

  for (let i = 0; i < dataRows.length; i++) {
    const cols = dataRows[i];
    const rowNum = i + 2;
    const name = (cols[0] ?? "").trim();
    const address = (cols[1] ?? "").trim();
    const postcode = (cols[2] ?? "").trim() || null;
    const phone = (cols[3] ?? "").trim() || null;
    const status = (cols[4] ?? "").trim();
    const appointmentDate = (cols[5] ?? "").trim();
    const followDate = (cols[6] ?? "").trim();
    const time = (cols[7] ?? "").trim();
    const existingSystem = (cols[9] ?? "").trim();
    const email = (cols[10] ?? "").trim() || null;
    const consultant = (cols[12] ?? "").trim();
    const notes = cols.slice(13, 22).map((n) => (n ?? "").trim()).filter(Boolean);

    if (!name) continue;

    const idempotencyKey = `csv-nilmoy-customer-${i + 1}`;
    const { stage, lostReason, doorOutcome, callOutcome } = mapStatus(status);
    const source = isCallSource(status) ? "call" : "d2d";
    const phoneKey = normalizePhone(phone);
    const { firstName, lastName } = splitName(name);

    const { data: existingKnock } = await supabase
      .from("door_knocks")
      .select("id, contact_id")
      .eq("rep_id", REP_ID)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingKnock) {
      summary.push({ row: rowNum, action: "skipped (already imported)", name, leadStage: stage });
      continue;
    }

    let contact =
      (existingContacts ?? []).find((c) => {
        const cKey = normalizePhone(c.phone);
        return (
          phoneKey &&
          cKey &&
          phoneKey === cKey &&
          addressMatches(c.address, address)
        );
      }) ??
      (existingContacts ?? []).find((c) => {
        const cName = normalizeText([c.first_name, c.last_name].filter(Boolean).join(" "));
        const rowName = normalizeText(name);
        return (
          cName &&
          rowName &&
          (cName.includes(rowName) || rowName.includes(cName)) &&
          addressMatches(c.address, address)
        );
      }) ??
      null;

    let contactId = contact?.id ?? null;
    const lat = contact?.lat ?? DEFAULT_LAT;
    const lng = contact?.lng ?? DEFAULT_LNG;

    if (!contactId) {
      const { data: inserted, error } = await supabase
        .from("contacts")
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          email,
          address: address || null,
          postcode,
          lat,
          lng,
          created_by: REP_ID,
        })
        .select("id")
        .single();
      if (error) throw error;
      contactId = inserted.id;
      contact = { id: contactId, first_name: firstName, last_name: lastName, phone, address, postcode, email, lat, lng };
      existingContacts?.push(contact);
    } else {
      const updates = {};
      if (firstName && !contact.first_name) updates.first_name = firstName;
      if (lastName && !contact.last_name) updates.last_name = lastName;
      if (phone && !contact.phone) updates.phone = phone;
      if (email && !contact.email) updates.email = email;
      if (address && !contact.address) updates.address = address;
      if (postcode && !contact.postcode) updates.postcode = postcode;
      if (Object.keys(updates).length) {
        await supabase.from("contacts").update(updates).eq("id", contactId);
      }
    }

    const appointmentAt = parseDateTime(appointmentDate, time);
    const followAt = parseDateTime(followDate, time) ?? appointmentAt;

    const noteLines = [];
    if (consultant) noteLines.push(`Consultant: ${consultant}`);
    if (existingSystem) noteLines.push(`Existing system: ${existingSystem}`);
    if (status) noteLines.push(`Sheet status: ${status}`);
    noteLines.push(...notes);
    const combinedNotes = noteLines.join("\n");

    let doorKnockId = null;
    let callLogId = null;

    if (source === "call") {
      const { data: callLog, error: callErr } = await supabase
        .from("call_logs")
        .insert({
          contact_id: contactId,
          rep_id: REP_ID,
          outcome: callOutcome,
          notes: combinedNotes || null,
          called_at: appointmentAt ?? new Date().toISOString(),
          follow_up_at: followAt,
        })
        .select("id")
        .single();
      if (callErr) throw callErr;
      callLogId = callLog.id;
    } else {
      const { data: knock, error: knockErr } = await supabase
        .from("door_knocks")
        .insert({
          contact_id: contactId,
          rep_id: REP_ID,
          outcome: doorOutcome,
          notes: combinedNotes || null,
          knocked_at: appointmentAt ?? new Date().toISOString(),
          lat,
          lng,
          follow_up_at: followAt,
          synced: true,
          idempotency_key: idempotencyKey,
        })
        .select("id")
        .single();
      if (knockErr) throw knockErr;
      doorKnockId = knock.id;
    }

    const existingLead = leadsByContact.get(contactId);
    let leadId = existingLead?.id ?? null;
    const finalStage = existingLead
      ? pickStage(existingLead.stage, stage)
      : stage;

    if (!leadId) {
      const { data: lead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          contact_id: contactId,
          rep_id: REP_ID,
          source,
          stage: finalStage,
          door_knock_id: doorKnockId,
          call_log_id: callLogId,
          lost_reason: finalStage === "lost" ? lostReason : null,
        })
        .select("id, stage")
        .single();
      if (leadErr) throw leadErr;
      leadId = lead.id;
      leadsByContact.set(contactId, lead);
    } else {
      await supabase
        .from("leads")
        .update({
          stage: finalStage,
          lost_reason: finalStage === "lost" ? lostReason : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    }

    if (existingLead && existingLead.stage !== finalStage) {
      await supabase.from("lead_activity").insert({
        lead_id: leadId,
        actor_id: REP_ID,
        type: "stage_change",
        content: JSON.stringify({
          from_stage: existingLead.stage,
          to_stage: finalStage,
          source: "csv_import",
        }),
      });
    }

    for (const note of notes) {
      await supabase.from("lead_activity").insert({
        lead_id: leadId,
        actor_id: REP_ID,
        type: "note",
        content: note,
      });
    }

    if (combinedNotes && notes.length === 0) {
      await supabase.from("lead_activity").insert({
        lead_id: leadId,
        actor_id: REP_ID,
        type: "note",
        content: combinedNotes,
      });
    }

    if (
      followAt &&
      finalStage !== "signed" &&
      finalStage !== "lost"
    ) {
      await supabase.from("follow_ups").insert({
        lead_id: leadId,
        rep_id: REP_ID,
        due_at: followAt,
        note: consultant ? `Follow-up (Consultant: ${consultant})` : "Imported follow-up",
        completed: finalStage === "signed",
      });
    }

    summary.push({
      row: rowNum,
      action: existingLead ? "updated lead" : "created lead",
      name,
      leadStage: finalStage,
    });
  }

  console.log(`Imported ${summary.length} customer rows for rep Nilmoy:\n`);
  for (const s of summary) {
    console.log(`  row ${s.row}: ${s.action} — ${s.name} → ${s.leadStage}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
