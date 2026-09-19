import "server-only";

import { summariseOutreach, type OutreachSummary } from "./outreach-summary";
import { readSheetRanges, sheetsConfigured } from "./sheets-read";

/**
 * Reads the Casdey-Gym-Leads sheet for /admin's Outreach section.
 *
 * Authenticates as the same service account the outreach routines write with
 * (casdey-routine@casdey-gws-cli.iam.gserviceaccount.com), minting a token
 * with the JWT Bearer grant (src/lib/sheets-read.ts), with the
 * read-only Sheets scope: /admin can never change a lead. The key arrives as
 * GOOGLE_SERVICE_ACCOUNT_JSON, the key file's whole contents, the same name
 * the check-up routine's cloud environment already uses.
 *
 * Returns null (never a fake zero) when the key is not set or Google fails,
 * matching posthog-query.ts, so the page says so instead of drawing a rate.
 */

export function outreachConfigured(): boolean {
  return sheetsConfigured();
}

export async function outreachSummary(
  days: number,
): Promise<OutreachSummary | null> {
  const tabs = await readSheetRanges(["Leads!A2:U6000", "Send Log!A2:D10000"]);
  if (!tabs) return null;
  const [leads, sends] = tabs;
  return summariseOutreach(leads, sends, days);
}
