import "server-only";

import { createSign } from "node:crypto";

import { summariseOutreach, type OutreachSummary } from "./outreach-summary";

/**
 * Reads the Casdey-Gym-Leads sheet for /admin's Outreach section.
 *
 * Authenticates as the same service account the outreach routines write with
 * (casdey-routine@casdey-gws-cli.iam.gserviceaccount.com), minting a token
 * with the JWT Bearer grant the way scripts/google-doc.mjs does, but with the
 * read-only Sheets scope: /admin can never change a lead. The key arrives as
 * GOOGLE_SERVICE_ACCOUNT_JSON, the key file's whole contents, the same name
 * the check-up routine's cloud environment already uses.
 *
 * Returns null (never a fake zero) when the key is not set or Google fails,
 * matching posthog-query.ts, so the page says so instead of drawing a rate.
 */

const LEADS_SHEET_ID = "1WOAIA1gvK6S1kWe_Vf4-d4XmjhnDLQZLtyU_ezvOu3w";
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
    console.error("[outreach-stats] GOOGLE_SERVICE_ACCOUNT_JSON is not JSON");
    return null;
  }
}

export function outreachConfigured(): boolean {
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

export async function outreachSummary(
  days: number,
): Promise<OutreachSummary | null> {
  const key = serviceAccountKey();
  if (!key) return null;

  try {
    const token = await accessToken(key);
    const ranges = ["Leads!A2:U6000", "Send Log!A2:D10000"]
      .map((range) => `ranges=${encodeURIComponent(range)}`)
      .join("&");
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${LEADS_SHEET_ID}/values:batchGet?${ranges}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!response.ok) {
      console.error(
        "[outreach-stats] sheet read failed",
        response.status,
        await response.text().catch(() => ""),
      );
      return null;
    }

    const body = (await response.json()) as {
      valueRanges?: { values?: string[][] }[];
    };
    const [leads, sends] = body.valueRanges ?? [];
    return summariseOutreach(leads?.values ?? [], sends?.values ?? [], days);
  } catch (error) {
    console.error("[outreach-stats] request threw", error);
    return null;
  }
}
