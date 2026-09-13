import "server-only";

import { createSign } from "node:crypto";

/**
 * Read and write the Casdey-Gym-Leads sheet from the app, as the outreach
 * service account (casdey-routine@casdey-gws-cli.iam.gserviceaccount.com), via
 * the JWT Bearer grant. The key arrives as GOOGLE_SERVICE_ACCOUNT_JSON, the key
 * file's whole contents. Same mechanism as outreach-stats.ts, which stays
 * read-only on purpose; this one is for jobs that must write, like the
 * Instagram publisher filling in Posted dates.
 */

export const LEADS_SHEET_ID = "1WOAIA1gvK6S1kWe_Vf4-d4XmjhnDLQZLtyU_ezvOu3w";

type ServiceAccountKey = { client_email: string; private_key: string; token_uri: string };

const base64url = (input: string | Buffer): string =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function sheetsWriteToken(): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const key = JSON.parse(raw) as ServiceAccountKey;
  const now = Math.floor(Date.now() / 1000);
  const signingInput = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(
    JSON.stringify({ iss: key.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: key.token_uri, iat: now, exp: now + 3600 }),
  )}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(key.private_key);
  const response = await fetch(key.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${signingInput}.${base64url(signature)}` }),
    cache: "no-store",
  });
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) throw new Error(`Google token request failed (${response.status})`);
  return body.access_token;
}

const valuesUrl = (range: string) =>
  `https://sheets.googleapis.com/v4/spreadsheets/${LEADS_SHEET_ID}/values/${encodeURIComponent(range)}`;

export async function readRange(token: string, range: string): Promise<string[][]> {
  const response = await fetch(valuesUrl(range), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`sheet read ${range} failed (${response.status})`);
  const body = (await response.json()) as { values?: string[][] };
  return body.values ?? [];
}

export async function writeRange(token: string, range: string, values: string[][]): Promise<void> {
  const response = await fetch(`${valuesUrl(range)}?valueInputOption=RAW`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ values }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`sheet write ${range} failed (${response.status})`);
}

export async function appendRow(token: string, range: string, row: string[]): Promise<void> {
  const response = await fetch(`${valuesUrl(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ values: [row] }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`sheet append ${range} failed (${response.status})`);
}
