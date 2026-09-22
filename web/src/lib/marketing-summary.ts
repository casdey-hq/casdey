/**
 * The marketing picture for /admin, from the Casdey-Gym-Leads sheet: engaged
 * leads by name, the weekly test review, Instagram DMs, Instagram content and
 * inbound DMs.
 *
 * Ported from scripts/check-up-marketing.mjs (2026-09-19, IMPROVEMENTS.md #2)
 * so /admin shows it live instead of once a week in a separate report. The
 * rules are the check-up's, kept identical on purpose: the Sunday review and
 * /admin must never disagree about who is engaged or whether a test is
 * called. Pure, so it is tested without the sheet (marketing-summary.test.ts).
 *
 * Column letters are the sheet's headers as of 2026-09-19:
 *   Leads      A=#  B=Gym  R=Status  S=Date Contacted  U=Reply?
 *   Send Log   A=Lead #  D=Date Sent  N=Variant  Q=Subject Variant
 *   IG Outreach  B=Gym  E=Handle  H=Draft DM  J=Date Sent  K=Reply?  P=FU1 Sent?  S=FU2 Sent?
 *   IG Content   A=#  B=Planned date  E=Hook  I=Status  J=Feedback  K=Posted  L=Link
 *   Inbound DMs  A=Date  B=Handle  C=Gym  F=Came from  G=Video sent  H=Status
 *   IG Weekly    A=Week ending  B=Followers  C=Reached  D=Engaged
 *   Test Log     A=ID ... V=Status (see testReview below)
 */

const DAY = 86_400_000;

/** The first scheduled Instagram post; the content plan runs 100 days. */
export const CONTENT_START = Date.UTC(2026, 8, 16);
const CONTENT_DAYS = 100;

/** Replies this low cannot separate two arms, whatever the rates say. */
export const MIN_REPLIES_TO_CALL = 10;

export type MarketingTabs = {
  leads: string[][];
  sendLog: string[][];
  igOutreach: string[][] | null;
  igContent: string[][] | null;
  inboundDms: string[][] | null;
  igWeekly: string[][] | null;
  testLog: string[][] | null;
};

export type EngagedLead = {
  lead: string;
  gym: string;
  status: string;
  contacted: string;
};

export type TestArm = {
  letter: string;
  key: string;
  sends: number;
  replies: number;
  replyRatePct: number | null;
  engaged: number;
};

export type RunningTest = {
  id: string;
  weekStarted: string;
  asset: string;
  component: string;
  hypothesis: string | null;
  variants: string[];
  arms: TestArm[];
  totalReplies: number;
  pValue: number | null;
  leader: string | null;
  verdict: string;
  daysRunning: number | null;
  reviewOverdueDays: number | null;
  /** The day the next review falls due: seven days after the last one. */
  reviewDueOn: string | null;
  /** Keyed by the Test Log's own headers, for scripts/test-log-update.mjs. */
  proposedUpdate: Record<string, string>;
};

export type ClosedTest = {
  id: string;
  asset: string;
  component: string;
  winner: string;
  decision: string | null;
  weekEnded: string | null;
};

export type MarketingSummary = {
  engagedLeads: EngagedLead[];
  /**
   * Gyms first contacted in the last seven days, and how many of those replied
   * or became engaged. The weekly goal is measured on this cohort, not all
   * time, which every earlier cohort drags down (agreed 2026-09-13).
   */
  weekCohort: {
    contacted: number;
    replied: number;
    engaged: number;
    engagedRatePct: number | null;
    replyRatePct: number | null;
  };
  igOutreach: {
    sentTotal: number;
    sentThisWeek: number;
    replies: number;
    fu1Sent: number;
    fu2Sent: number;
    unsentDrafts: number;
  } | null;
  igContent: {
    day: number | null;
    postedTotal: number;
    postedThisWeek: number;
    expectedSoFar: number;
    behindBy: number;
    awaitingReview: number;
    approvedNotPosted: number;
    /** Days from today with nothing approved or posted, within the next 3. */
    uncoveredNextDays: string[];
    feedbackOpen: { post: string; feedback: string }[];
  } | null;
  inboundDms: {
    total: number;
    thisWeek: number;
    engagedTotal: number;
    videoNotSentYet: { handle: string; gym: string; date: string }[];
  } | null;
  igWeekly: {
    weekEnding: string;
    followers: number | null;
    reached: number | null;
    accountsEngaged: number | null;
    followerGrowthPct: number | null;
    missingThisWeek: boolean;
  } | null;
  runningTests: RunningTest[];
  closedTests: ClosedTest[];
};

const pct = (part: number, whole: number): number | null =>
  whole ? +((part / whole) * 100).toFixed(2) : null;

/**
 * Dates Davide types by hand come back as he typed them: 16/09/2026 as often
 * as 2026-09-16. Day first, European style, when it isn't ISO.
 */
export function parseSheetDate(text: string | undefined): number | null {
  const s = (text ?? "").trim();
  if (!s) return null;
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  const t = dmy ? Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1]) : Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

/**
 * Two-sided p-value of a two-proportion z-test, or null when it cannot be
 * computed (an empty arm, or no replies anywhere). Normal CDF by the
 * Abramowitz-Stegun approximation, ample for a go/no-go call.
 */
export function twoProportionP(
  r1: number,
  n1: number,
  r2: number,
  n2: number,
): number | null {
  if (!n1 || !n2) return null;
  const pooled = (r1 + r2) / (n1 + n2);
  if (pooled === 0 || pooled === 1) return null;
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  const z = Math.abs(r1 / n1 - r2 / n2) / se;
  const t = 1 / (1 + 0.2316419 * z);
  const density = 0.3989423 * Math.exp((-z * z) / 2);
  const tail =
    density *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return +(2 * tail).toFixed(3);
}

/** "S1 = \"quick question…\"" → "S1". */
const armKey = (text: string | undefined): string | null =>
  (text ?? "").split("=")[0].trim() || null;

const ARM_LETTERS = ["A", "B", "C"];

/** Monday 00:00 UTC of the week containing this moment — the goal ("1%
 *  engaged leads for the week") is judged against the calendar week, not a
 *  rolling 7 days back from whenever the page happens to load. */
function mondayOf(at: number): number {
  const d = new Date(at);
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const offset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - offset);
  return day.getTime();
}

export function summariseMarketing(
  tabs: MarketingTabs,
  now: number = Date.now(),
): MarketingSummary {
  const weekStart = mondayOf(now);
  const recent = (text: string | undefined) => {
    const t = parseSheetDate(text);
    return t !== null && t >= weekStart;
  };
  const today = new Date(now).toISOString().slice(0, 10);

  // --- Leads: who replied, who is engaged.
  const repliedLeads = new Set<string>();
  const engagedNumbers = new Set<string>();
  const engagedLeads: EngagedLead[] = [];
  const cohort = { contacted: 0, replied: 0, engaged: 0 };
  for (const row of tabs.leads) {
    const status = (row[17] ?? "").trim();
    if (!status || status === "Not contacted") continue;
    const reply = (row[20] ?? "").trim().toLowerCase();
    if (reply === "replied" || reply === "y") repliedLeads.add(row[0]);
    const isEngaged = status === "Interested" || status === "Committed";
    if (recent(row[18])) {
      cohort.contacted += 1;
      if (reply === "replied" || reply === "y") cohort.replied += 1;
      if (isEngaged) cohort.engaged += 1;
    }
    if (isEngaged) {
      engagedNumbers.add(row[0]);
      engagedLeads.push({
        lead: row[0],
        gym: row[1] ?? "",
        status,
        contacted: row[18] ?? "",
      });
    }
  }

  // --- Send Log first touches, for the test review. Any single capital
  // letter in Variant is a first touch; FU1/FU2 are follow-ups, REPLY is a
  // reply the routine sent, blank predates the column.
  const firstTouches: { lead: string; date: string; variant: string; subject: string }[] = [];
  for (const row of tabs.sendLog) {
    const date = row[3];
    if (!date) continue;
    const variant = (row[13] ?? "").trim();
    if (/^[A-Z]$/.test(variant)) {
      firstTouches.push({
        lead: row[0],
        date,
        variant,
        subject: (row[16] ?? "").trim(),
      });
    }
  }

  // --- Instagram cold DMs, sent by hand.
  let igOutreach: MarketingSummary["igOutreach"] = null;
  if (tabs.igOutreach) {
    const summary = { sentTotal: 0, sentThisWeek: 0, replies: 0, fu1Sent: 0, fu2Sent: 0, unsentDrafts: 0 };
    for (const row of tabs.igOutreach) {
      if (row[9]) {
        summary.sentTotal += 1;
        if (recent(row[9])) summary.sentThisWeek += 1;
      } else if ((row[7] ?? "").trim()) {
        summary.unsentDrafts += 1;
      }
      const reply = (row[10] ?? "").trim().toLowerCase();
      if (reply && reply !== "n" && reply !== "no") summary.replies += 1;
      if ((row[15] ?? "").trim()) summary.fu1Sent += 1;
      if ((row[18] ?? "").trim()) summary.fu2Sent += 1;
    }
    igOutreach = summary;
  }

  // --- Instagram content: one post a day for 100 days from CONTENT_START.
  let igContent: MarketingSummary["igContent"] = null;
  if (tabs.igContent) {
    const rows = tabs.igContent.filter((row) => row[0]);
    const status = (row: string[]) => (row[8] ?? "").trim().toLowerCase();
    const posted = rows.filter((row) => parseSheetDate(row[10]) !== null);
    const daysIn = Math.floor((now - CONTENT_START) / DAY) + 1;
    const expectedSoFar = Math.max(0, Math.min(daysIn, CONTENT_DAYS));
    // A day is covered when a post planned for it is approved or already out.
    const covered = new Set(
      rows
        .filter((row) => status(row) === "approved" || parseSheetDate(row[10]) !== null)
        .map((row) => {
          const t = parseSheetDate(row[1]);
          return t === null ? null : new Date(t).toISOString().slice(0, 10);
        })
        .filter((day): day is string => day !== null),
    );
    const uncoveredNextDays: string[] = [];
    for (let offset = 0; offset < 3; offset += 1) {
      const day = new Date(now + offset * DAY).toISOString().slice(0, 10);
      const inPlan = Date.parse(day) >= CONTENT_START && Date.parse(day) < CONTENT_START + CONTENT_DAYS * DAY;
      if (inPlan && !covered.has(day)) uncoveredNextDays.push(day);
    }
    igContent = {
      day: daysIn > 0 ? Math.min(daysIn, CONTENT_DAYS) : null,
      postedTotal: posted.length,
      postedThisWeek: posted.filter((row) => recent(row[10])).length,
      expectedSoFar,
      behindBy: Math.max(0, expectedSoFar - posted.length),
      awaitingReview: rows.filter(
        (row) => !parseSheetDate(row[10]) && /draft|changes/.test(status(row)),
      ).length,
      approvedNotPosted: rows.filter(
        (row) => !parseSheetDate(row[10]) && status(row) === "approved",
      ).length,
      uncoveredNextDays,
      feedbackOpen: rows
        .filter((row) => (row[9] ?? "").trim() && !parseSheetDate(row[10]) && /changes/.test(status(row)))
        .map((row) => ({ post: row[0], feedback: row[9] })),
    };
  }

  // --- Inbound DMs: every gym that asks for the video on Instagram.
  let inboundDms: MarketingSummary["inboundDms"] = null;
  if (tabs.inboundDms) {
    const rows = tabs.inboundDms.filter((row) => row[0] || row[1]);
    const engaged = (row: string[]) => /interested|committed/i.test(row[7] ?? "");
    inboundDms = {
      total: rows.length,
      thisWeek: rows.filter((row) => recent(row[0])).length,
      engagedTotal: rows.filter(engaged).length,
      videoNotSentYet: rows
        .filter((row) => !(row[6] ?? "").trim() && !/dead/i.test(row[7] ?? ""))
        .map((row) => ({ handle: row[1] ?? "", gym: row[2] ?? "", date: row[0] ?? "" })),
    };
  }

  // --- IG Weekly, written by the Instagram publisher's Saturday run.
  let igWeekly: MarketingSummary["igWeekly"] = null;
  if (tabs.igWeekly) {
    const num = (text: string | undefined) => {
      const raw = String(text ?? "").trim();
      const n = Number(raw.replace(/[^\d.]/g, ""));
      return raw === "" || Number.isNaN(n) ? null : n;
    };
    const rows = tabs.igWeekly
      .filter((row) => parseSheetDate(row[0]) !== null)
      .sort((a, b) => parseSheetDate(a[0])! - parseSheetDate(b[0])!);
    const latest = rows.at(-1);
    const previous = rows.at(-2);
    if (latest) {
      const followers = num(latest[1]);
      const before = previous ? num(previous[1]) : null;
      igWeekly = {
        weekEnding: latest[0],
        followers,
        reached: num(latest[2]),
        accountsEngaged: num(latest[3]),
        followerGrowthPct:
          followers !== null && before ? +(((followers - before) / before) * 100).toFixed(1) : null,
        missingThisWeek: now - parseSheetDate(latest[0])! > 8 * DAY,
      };
    }
  }

  // --- The weekly test review.
  const runningTests: RunningTest[] = [];
  const closedTests: ClosedTest[] = [];
  for (const row of tabs.testLog ?? []) {
    if (!row[0]) continue;
    const status = (row[21] ?? "").trim().toLowerCase();
    if (status !== "running") {
      closedTests.push({
        id: row[0],
        asset: row[3] ?? "",
        component: row[4] ?? "",
        winner: row[18] ?? "",
        decision: row[19] || null,
        weekEnded: row[2] || null,
      });
      continue;
    }

    // Which Send Log column tells the arms apart: the subject variant for a
    // subject-line test, the body variant otherwise.
    const bySubject = /subject/i.test(row[4] ?? "");
    const since = Date.parse(row[1]);
    const arms: TestArm[] = [row[6], row[7], row[8]]
      .map((text, index) => ({ key: armKey(text), letter: ARM_LETTERS[index] }))
      .filter((arm): arm is { key: string; letter: string } => arm.key !== null)
      .map(({ key, letter }) => {
        const sends = firstTouches.filter(
          (ft) =>
            (bySubject ? ft.subject : ft.variant) === key &&
            (Number.isNaN(since) || Date.parse(ft.date) >= since),
        );
        // A reply is credited to the arm of the lead's first touch, even when
        // it came after a follow-up: the first touch is what the test varied.
        const leads = new Set(sends.map((ft) => ft.lead));
        const replies = [...leads].filter((lead) => repliedLeads.has(lead)).length;
        const engaged = [...leads].filter((lead) => engagedNumbers.has(lead)).length;
        return { letter, key, sends: sends.length, replies, replyRatePct: pct(replies, sends.length), engaged };
      });

    const totalReplies = arms.reduce((sum, arm) => sum + arm.replies, 0);
    const pValue =
      arms.length >= 2
        ? twoProportionP(arms[0].replies, arms[0].sends, arms[1].replies, arms[1].sends)
        : null;
    const leader =
      [...arms].sort((a, b) => (b.replyRatePct ?? 0) - (a.replyRatePct ?? 0))[0] ?? null;
    const tied = arms.length >= 2 && arms[0].replyRatePct === arms[1].replyRatePct;

    let verdict: string;
    if (totalReplies < MIN_REPLIES_TO_CALL) {
      verdict = `Too few replies to call (${totalReplies} across all arms, want ${MIN_REPLIES_TO_CALL}+)`;
    } else if (pValue !== null && pValue < 0.05) {
      verdict = `${leader!.key} wins (p=${pValue})`;
    } else if (tied) {
      verdict = "Dead heat";
    } else {
      verdict = `${leader!.key} leads, not significantly (p=${pValue})`;
    }

    const lastReviewed = Date.parse(row[2] || row[1]);
    const daysSinceReview = Number.isNaN(lastReviewed)
      ? null
      : Math.floor((now - lastReviewed) / DAY);

    const proposedUpdate: Record<string, string> = { "Week ended": today };
    for (const arm of arms) {
      proposedUpdate[`Sends ${arm.letter}`] = String(arm.sends);
      proposedUpdate[`Replies ${arm.letter}`] = String(arm.replies);
      proposedUpdate[`Reply-rate ${arm.letter}`] =
        arm.replyRatePct === null ? "" : `${arm.replyRatePct}%`;
    }

    runningTests.push({
      id: row[0],
      weekStarted: row[1] ?? "",
      asset: row[3] ?? "",
      component: row[4] ?? "",
      hypothesis: row[5] || null,
      variants: [row[6], row[7], row[8]].filter((v): v is string => Boolean(v)),
      arms,
      totalReplies,
      pValue,
      leader: leader?.key ?? null,
      verdict,
      daysRunning: Number.isNaN(since) ? null : Math.floor((now - since) / DAY),
      reviewOverdueDays: daysSinceReview === null ? null : Math.max(0, daysSinceReview - 7),
      reviewDueOn: Number.isNaN(lastReviewed)
        ? null
        : new Date(lastReviewed + 7 * DAY).toISOString().slice(0, 10),
      proposedUpdate,
    });
  }

  return {
    engagedLeads,
    weekCohort: {
      ...cohort,
      engagedRatePct: pct(cohort.engaged, cohort.contacted),
      replyRatePct: pct(cohort.replied, cohort.contacted),
    },
    igOutreach,
    igContent,
    inboundDms,
    igWeekly,
    runningTests,
    closedTests,
  };
}
