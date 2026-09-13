/**
 * Puts a batch of Instagram posts into the Casdey-Gym-Leads sheet, so Davide
 * can review, give feedback and mark what he posted (content-plan.md).
 *
 *   node scripts/instagram-sheet-sync.mjs [batch]
 *   npm run ig:sync -- batch-01
 *
 * Idempotent. First makes sure the three Instagram tabs exist with their
 * headers, then upserts each post of content/instagram/<batch>.json into
 * `IG Content` by its `#`.
 *
 * Column ownership, same rule as the outreach tabs:
 *   IG Content   A-I are written here (A #, B Planned date, C Pillar, D Format,
 *                E Hook, F Slides, G Caption, H Images, I Status). J Feedback,
 *                K Posted (date) and L Post link are Davide's and never touched.
 *   Inbound DMs  entirely Davide's: every gym that asks for the video on
 *                Instagram, from a post or from a cold DM.
 *   IG Weekly    entirely Davide's: one row a week, filled on Saturday so the
 *                Sunday 02:00 UTC check-up sees it.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const SHEET_ID = "1WOAIA1gvK6S1kWe_Vf4-d4XmjhnDLQZLtyU_ezvOu3w"; // Casdey-Gym-Leads

const TABS = {
  "IG Content": ["#", "Planned date", "Pillar", "Format", "Hook (slide 1)", "Slides", "Caption", "Images", "Status", "Feedback (Davide)", "Posted (date)", "Post link"],
  "Inbound DMs": ["Date", "Instagram handle", "Gym / studio", "City", "Country", "Came from (post #, profile, cold DM)", "Video sent (date)", "Status (Interested / Committed / Dead)", "Notes"],
  "IG Weekly": ["Week ending (Sunday)", "Followers", "Accounts reached (last 7 days)", "Profile visits (last 7 days)", "Notes"],
};

function serviceAccountKey() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const file =
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE ??
    (() => {
      const found = fs.readdirSync(repoRoot).find((f) => /^casdey-gws-cli-.*\.json$/.test(f));
      return found ? path.join(repoRoot, found) : null;
    })();
  if (!file) throw new Error("No service-account key: set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE.");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const base64url = (input) => Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function accessToken() {
  const key = serviceAccountKey();
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: key.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: key.token_uri, iat: now, exp: now + 3600 };
  const signingInput = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(claims))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), key.private_key);
  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${signingInput}.${base64url(signature)}` }),
  }).then((r) => r.json());
  if (!res.access_token) throw new Error(`token failed: ${JSON.stringify(res)}`);
  return res.access_token;
}

const token = await accessToken();
const api = async (url, init = {}) => {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${url}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) },
  }).then((res) => res.json());
  if (r.error) throw new Error(`${url}: ${r.error.status} ${r.error.message}`);
  return r;
};
const range = (tab, a1) => encodeURIComponent(`'${tab}'!${a1}`);

// 1. The tabs and their headers.
const meta = await api("?fields=sheets.properties");
const existing = new Map(meta.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
const missing = Object.keys(TABS).filter((tab) => !existing.has(tab));
if (missing.length) {
  const added = await api(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })) }),
  });
  for (const reply of added.replies) existing.set(reply.addSheet.properties.title, reply.addSheet.properties.sheetId);
  console.log(`created tabs: ${missing.join(", ")}`);
}
for (const [tab, headers] of Object.entries(TABS)) {
  await api(`/values/${range(tab, "A1")}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [headers] }) });
}
await api(":batchUpdate", {
  method: "POST",
  body: JSON.stringify({
    requests: Object.keys(TABS).map((tab) => ({
      repeatCell: { range: { sheetId: existing.get(tab), startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: "userEnteredFormat.textFormat.bold" },
    })),
  }),
});

// 2. The batch into IG Content, upserted by #.
const batchArg = process.argv[2];
if (batchArg) {
  const batchFile = batchArg.endsWith(".json") ? path.resolve(batchArg) : path.join(repoRoot, "content", "instagram", `${batchArg}.json`);
  const batch = JSON.parse(fs.readFileSync(batchFile, "utf8"));
  const current = (await api(`/values/${range("IG Content", "A2:A2000")}`)).values ?? [];
  const rowOf = new Map(current.map((row, i) => [String(row[0] ?? ""), i + 2]));
  let nextRow = current.length + 2;
  const plain = (text = "") => text.replace(/\[\[(.+?)\]\]/g, "$1");
  const data = batch.posts.map((post) => {
    const slidesText = post.slides
      .map((s, i) => {
        const parts = [s.eyebrow, s.title && plain(s.title), s.big && `${s.big} ${s.label ?? ""}`.trim(), s.sub && plain(s.sub), s.body, s.lines?.join("\n")].filter(Boolean);
        return `${i + 1}. ${parts.join(" / ")}`;
      })
      .join("\n\n");
    const row = rowOf.get(post.id) ?? nextRow++;
    return {
      range: `'IG Content'!A${row}:I${row}`,
      values: [[post.id, post.planned, post.pillar, post.format, plain(post.slides[0].title), slidesText, post.caption, `content/instagram/out/${post.id}/ (${post.slides.length} images)`, post.status ?? "Draft"]],
    };
  });
  await api("/values:batchUpdate", { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data }) });
  console.log(`IG Content: ${data.length} posts written (${batch.batch})`);
}
