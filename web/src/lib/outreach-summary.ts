/**
 * The outreach numbers /admin shows, computed from the rows of the
 * Casdey-Gym-Leads sheet. Pure, so it can be tested without Google; the fetch
 * lives in outreach-stats.ts. scripts/check-up-marketing.mjs reads the same
 * columns the same way for /check-up, and the two must stay in step.
 *
 * All time, deliberately — the weekly goal has its own Monday-based cohort in
 * marketing-summary.ts, and a rolling "vs the period before" split here would
 * either duplicate that or disagree with it. This is the standing "how has
 * outreach done overall" picture, not something a reporting-period selector
 * has anything to change.
 *
 * Two rates, deliberately distinct (Davide, 2026-09-13):
 *
 *   - Reply rate: gyms that sent a genuine reply, whatever it said. Most say
 *     no thanks. The `Reply?` column holds "Replied" (or "Unsubscribed" for an
 *     opt-out, which is counted separately and not as a reply).
 *   - Engaged leads: gyms actually interested in the product, the way JD at
 *     BodyActive is. A `Status` of Interested or Committed.
 *
 * Both are over gyms contacted, not emails sent, because a gym gets up to
 * three emails and can only reply, or be interested, once.
 */

/** Zero-based column indexes, Leads!A onwards. */
export const LEADS_COLUMNS = {
  number: 0,
  gym: 1,
  status: 17,
  dateContacted: 18,
  reply: 20,
} as const;

/** Zero-based column indexes, 'Send Log'!A onwards. */
export const SEND_LOG_COLUMNS = { dateSent: 3 } as const;

const ENGAGED_STATUSES = new Set(["interested", "committed"]);

export type OutreachSummary = {
  contacted: number;
  genuineReplies: number;
  optOuts: number;
  engaged: number;
  engagedGyms: string[];
  /** Percent to two decimals, null with nobody contacted. */
  replyRate: number | null;
  engagedRate: number | null;
  /** Every logged send, all time — one row per actual email (first touch or
   *  follow-up), not per lead. */
  emailsSent: number;
};

const cell = (row: string[], index: number): string =>
  (row[index] ?? "").trim();

function percent(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return Math.round((part / whole) * 10_000) / 100;
}

export function summariseOutreach(
  leads: string[][],
  sends: string[][],
): OutreachSummary {
  const summary: OutreachSummary = {
    contacted: 0,
    genuineReplies: 0,
    optOuts: 0,
    engaged: 0,
    engagedGyms: [],
    replyRate: null,
    engagedRate: null,
    emailsSent: 0,
  };

  for (const row of leads) {
    const status = cell(row, LEADS_COLUMNS.status);
    if (status === "" || status.toLowerCase() === "not contacted") continue;
    summary.contacted += 1;

    const reply = cell(row, LEADS_COLUMNS.reply).toLowerCase();
    if (reply === "replied" || reply === "y") summary.genuineReplies += 1;
    if (reply === "unsubscribed") summary.optOuts += 1;

    if (ENGAGED_STATUSES.has(status.toLowerCase())) {
      summary.engaged += 1;
      summary.engagedGyms.push(cell(row, LEADS_COLUMNS.gym));
    }
  }

  for (const row of sends) {
    if (cell(row, SEND_LOG_COLUMNS.dateSent)) summary.emailsSent += 1;
  }

  summary.replyRate = percent(summary.genuineReplies, summary.contacted);
  summary.engagedRate = percent(summary.engaged, summary.contacted);
  return summary;
}
