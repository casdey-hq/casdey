/**
 * Writes the weekly test review's outcome into the Test Log tab of
 * Casdey-Gym-Leads. The one write /check-up is allowed, and only once Davide
 * has made the call in chat: picking a winner is his decision, never a
 * routine's (see .claude/skills/check-up/SKILL.md "The weekly test review").
 *
 *   node scripts/test-log-update.mjs T0 '{"Winner":"A","Status":"closed"}'
 *   node scripts/test-log-update.mjs --new '{"Test ID":"T2","Week started":"2026-09-14"}'
 *   node scripts/test-log-update.mjs T0 path/to/update.json
 *
 * The payload's keys are the tab's own header names (check-up-marketing.mjs's
 * `proposedTestLogUpdate` already uses them) and every key is checked against
 * the header row before anything is written. Prints the row before and after.
 * A file path is accepted because quoting JSON on a Windows command line is
 * miserable.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const SHEET_ID = "1WOAIA1gvK6S1kWe_Vf4-d4XmjhnDLQZLtyU_ezvOu3w"; // Casdey-Gym-Leads
const TAB = "'Test Log'";

function serviceAccountKey() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }
  const file =
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE ??
    (() => {
      const found = fs.readdirSync(repoRoot).find((f) => /^casdey-gws-cli-.*\.json$/.test(f));
      return found ? path.join(repoRoot, found) : null;
    })();
  if (!file) throw new Error("No service-account key (see check-up-marketing.mjs).");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const base64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function accessToken() {
  const key = serviceAccountKey();
  const now = Math.floor(Date.now() / 1000);
  const signingInput =
    `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.` +
    base64url(
      JSON.stringify({
        iss: key.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: key.token_uri,
        iat: now,
        exp: now + 3600,
      }),
    );
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), key.private_key);
  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${base64url(signature)}`,
    }),
  }).then((r) => r.json());
  if (!res.access_token) throw new Error(`token failed: ${JSON.stringify(res)}`);
  return res.access_token;
}

const [, , target, payloadArg] = process.argv;
if (!target || !payloadArg) {
  console.error("Usage: node scripts/test-log-update.mjs <Test ID | --new> '<json or path>'");
  process.exit(1);
}
const payload = JSON.parse(fs.existsSync(payloadArg) ? fs.readFileSync(payloadArg, "utf8") : payloadArg);

const token = await accessToken();
const api = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;
const auth = { Authorization: `Bearer ${token}` };

async function readTab() {
  const r = await fetch(`${api}/values/${encodeURIComponent(`${TAB}!A1:W200`)}`, { headers: auth }).then((r) => r.json());
  if (r.error) throw new Error(`read failed: ${r.error.message}`);
  return r.values ?? [];
}

const rows = await readTab();
const header = rows[0] ?? [];
for (const name of Object.keys(payload)) {
  if (!header.includes(name)) {
    throw new Error(`"${name}" is not a Test Log column. Columns: ${header.join(" | ")}`);
  }
}
if (header.length > 26) throw new Error("Test Log grew past column Z; extend the column lettering.");

let index;
if (target === "--new") {
  const id = payload["Test ID"];
  if (!id) throw new Error('--new needs a "Test ID".');
  if (rows.some((row, i) => i > 0 && row[0] === id)) throw new Error(`${id} already exists; update it instead.`);
  index = rows.length;
} else {
  index = rows.findIndex((row, i) => i > 0 && row[0] === target);
  if (index < 0) throw new Error(`No Test Log row with Test ID ${target}.`);
}
const rowNumber = index + 1;
const asRecord = (row) => Object.fromEntries(header.map((name, i) => [name, row?.[i] ?? ""]));

console.log("before:", JSON.stringify(asRecord(rows[index]), null, 1));

const data = Object.entries(payload).map(([name, value]) => ({
  range: `${TAB}!${String.fromCharCode(65 + header.indexOf(name))}${rowNumber}`,
  values: [[String(value)]],
}));
const write = await fetch(`${api}/values:batchUpdate`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
}).then((r) => r.json());
if (write.error) throw new Error(`write failed: ${write.error.message}`);

console.log("after:", JSON.stringify(asRecord((await readTab())[index]), null, 1));
