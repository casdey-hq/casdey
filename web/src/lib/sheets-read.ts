import "server-only";

import { createSign } from "node:crypto";

import { LEADS_SHEET_ID } from "./google-sheets";

/**
 * Read-only access to the Casdey-Gym-Leads sheet, for everything in /admin that
 * reads it. google-sheets.ts is the writing counterpart, used by the Instagram
 * publisher; this one asks Google for the read-only scope, so /admin cannot
 * change a lead even by mistake.
 *
 * Authenticates as the service account the outreach routines write with
 * (casdey-routine@casdey-gws-cli.iam.gserviceaccount.com), minting a token with
 * the JWT Bearer grant, with the
 * read-only Sheets scope: /admin can never change a lead. The key arrives as
 * GOOGLE_SERVICE_ACCOUNT_JSON, the key file's whole contents.
 */

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
  token_uri: string;
};

function serviceAccountKey(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccountKey;
  } catch {
    console.error("[sheets-read] GOOGLE_SERVICE_ACCOUNT_JSON is not JSON");
    return null;
  }
}

export function sheetsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

const base64url = (input: string | Buffer): string =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function accessToken(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const signingInput = `${base64url(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  )}.${base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: key.token_uri,
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(key.private_key);

  const response = await fetch(key.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${base64url(signature)}`,
    }),
    cache: "no-store",
  });
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error(`token request failed (${response.status})`);
  }
  return body.access_token;
}

/**
 * Several ranges of the leads sheet in one request, in the order asked.
 *
 * A range whose tab does not exist makes Google fail the whole batch, so
 * callers only ask for tabs that exist. Returns null (never a fake empty
 * sheet) when the key is missing or Google fails, so the page can say so.
 */
export async function readSheetRanges(
  ranges: string[],
): Promise<string[][][] | null> {
  const key = serviceAccountKey();
  if (!key) return null;

  try {
    const token = await accessToken(key);
    const query = ranges
      .map((range) => `ranges=${encodeURIComponent(range)}`)
      .join("&");
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${LEADS_SHEET_ID}/values:batchGet?${query}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!response.ok) {
      console.error(
        "[sheets-read] read failed",
        response.status,
        await response.text().catch(() => ""),
      );
      return null;
    }
    const body = (await response.json()) as {
      valueRanges?: { values?: string[][] }[];
    };
    return ranges.map((_, index) => body.valueRanges?.[index]?.values ?? []);
  } catch (error) {
    console.error("[sheets-read] request threw", error);
    return null;
  }
}
