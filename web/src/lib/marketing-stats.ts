import "server-only";

import { summariseMarketing, type MarketingSummary } from "./marketing-summary";
import { readSheetRanges } from "./sheets-read";

/**
 * The marketing picture, read live from the leads sheet in one request.
 * Null when the sheet cannot be read, so /admin says so rather than showing
 * zeros that look like a bad week.
 */
export async function marketingSummary(): Promise<MarketingSummary | null> {
  const tabs = await readSheetRanges([
    "Leads!A2:U6000",
    "Send Log!A2:Q10000",
    "IG Outreach!A2:S3000",
    "IG Content!A2:L2000",
    "Inbound DMs!A2:I2000",
    "IG Weekly!A2:E500",
    "Test Log!A2:W50",
  ]);
  if (!tabs) return null;
  const [leads, sendLog, igOutreach, igContent, inboundDms, igWeekly, testLog] = tabs;
  return summariseMarketing({
    leads,
    sendLog,
    igOutreach,
    igContent,
    inboundDms,
    igWeekly,
    testLog,
  });
}
