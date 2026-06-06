#!/usr/bin/env node
/**
 * Invoke Supabase hosted MCP (same endpoint Cursor uses).
 * Usage: node scripts/mcp-call.mjs <toolName> '<json-args>'
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const mcpPath = join(homedir(), ".cursor", "mcp.json");
const config = JSON.parse(readFileSync(mcpPath, "utf8"));
const token = config.mcpServers.supabase.headers.Authorization.replace(
  "Bearer ",
  "",
);
const url =
  "https://mcp.supabase.com/mcp?project_ref=glruwdknafegbcofvnbp";

async function initSession() {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "sunflare-scripts", version: "1.0" },
      },
    }),
  });
  const session = res.headers.get("mcp-session-id");
  if (!session) throw new Error(`initialize failed: ${res.status}`);
  return session;
}

async function callTool(session, name, args = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Session-Id": session,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const text = await res.text();
  const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
  const content = json.result?.content?.[0]?.text;
  if (!content) {
    console.error("Raw:", text.slice(0, 500));
    throw new Error(`No content from ${name}`);
  }
  return content;
}

const [toolName, argsJson = "{}"] = process.argv.slice(2);
if (!toolName) {
  console.error("Usage: node scripts/mcp-call.mjs <toolName> '<json-args>'");
  process.exit(1);
}

const session = await initSession();
const out = await callTool(session, toolName, JSON.parse(argsJson));
console.log(out);
