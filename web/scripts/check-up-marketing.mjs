/**
 * Marketing snapshot for /check-up: pulls live numbers out of the
 * Casdey-Gym-Leads sheet (id in CLAUDE.md "Stage 1 progress") via the same
 * service-account JWT pattern as scripts/google-doc.mjs / sheet-read.mjs.
 * Read-only.
 *
 *   node scripts/check-up-marketing.mjs
 *
 * Prints one JSON object: { leads, sendLog, igOutreach, igContent, inboundDms,
 * igWeekly, testLog }. The three Instagram content blocks come from tabs added
 * 2026-09-13 for content-plan.md, and read as null if a tab is missing.
 *
 * Two outreach rates, kept apart on purpose (Davide, 2026-09-13), and computed
 * the same way src/lib/outreach-summary.ts computes them for /admin:
 *   - genuineReplyRatePct: gyms whose `Reply?` reads "Replied", over gyms
 *     contacted. Most replies are a no thanks. Opt-outs ("Unsubscribed") are
 *     counted separately.
 *   - engagedRatePct: gyms actually interested in casdey, the way JD at
 *     BodyActive is: a `Status` of Interested or Committed.
 *
 * testLog carries the weekly test review (the Sunday marketing analysis, see
 * .claude/skills/check-up/SKILL.md "The weekly test review"): every running
 * test gets `liveReview`, its per-variant sends, replies and engaged leads
 * worked out from Send Log, plus a significance check and a
 * `proposedTestLogUpdate` whose keys are the Test Log's own headers. The
 * decision itself stays Davide's; nothing here writes.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const SHEET_ID = "1WOAIA1gvK6S1kWe_Vf4-d4XmjhnDLQZLtyU_ezvOu3w"; // Casdey-Gym-Leads

/**
 * The service-account key. Three ways in, in order, so this runs the same
 * locally (a key file at the repo root, gitignored) and in a cloud routine
 * (which has no such file — its secret has to arrive as an env var):
 *   1. GOOGLE_SERVICE_ACCOUNT_JSON — the whole key file's contents, inline.
 *   2. GOOGLE_SERVICE_ACCOUNT_FILE — a path to it.
 *   3. casdey-gws-cli-*.json at the repo root (the local default).
 */
function serviceAccountKey() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }
  const file =
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE ??
    (() => {
      const found = fs
        .readdirSync(repoRoot)
        .find((f) => /^casdey-gws-cli-.*\.json$/.test(f));
      return found ? path.join(repoRoot, found) : null;
    })();
  if (!file) {
    throw new Error(
      "No service-account key: set GOOGLE_SERVICE_ACCOUNT_JSON (the key file's " +
        "contents) or GOOGLE_SERVICE_ACCOUNT_FILE (a path to it), or put " +
        "casdey-gws-cli-<id>.json at the repo root.",
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const base64url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function accessToken() {
  const key = serviceAccountKey();
  const now = Math.floor(Date.now() / 1000);
  const signingInput =
    `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.` +
    `${base64url(
      JSON.stringify({
        iss: key.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: key.token_uri,
        iat: now,
        exp: now + 3600,
      }),
    )}`;
  const signature = crypto.sign(
    "RSA-SHA256",
    Buffer.from(signingInput),
    key.private_key,
  );
  const jwt = `${signingInput}.${base64url(signature)}`;
  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  }).then((r) => r.json());
  if (!res.access_token) throw new Error(`token failed: ${JSON.stringify(res)}`);
  return res.access_token;
}

async function values(token, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
  if (r.error) throw new Error(`${range}: ${r.error.status} — ${r.error.message}`);
  return r.values ?? [];
}

const DAY = 86_400_000;
const token = await accessToken();
const now = Date.now();
const weekAgo = now - 7 * DAY;
const today = new Date(now).toISOString().slice(0, 10);
const isRecent = (dateStr) => {
  if (!dateStr) return false;
  const t = Date.parse(dateStr);
  return !Number.isNaN(t) && t >= weekAgo;
};
const pct = (part, whole) => (whole ? +((part / whole) * 100).toFixed(2) : null);

// --- Leads tab: A=#, B=Gym, R=Status (17), S=Date Contacted (18), U=Reply? (20).
// Reply? holds "Replied" or "Unsubscribed", not Y/N: counting "Y" here read 0
// replies for weeks (fixed 2026-09-13).
const leadsRows = await values(token, "Leads!A2:U6000");
const statusCounts = {};
let contacted = 0;
let genuineReplies = 0;
let optOuts = 0;
const repliedLeads = new Set();
const engagedLeadNumbers = new Set();
const engagedLeads = [];
for (const row of leadsRows) {
  const status = (row[17] ?? "").trim() || "(blank)";
  statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  if (status === "Not contacted" || status === "(blank)") continue;
  contacted += 1;
  const reply = (row[20] ?? "").trim().toLowerCase();
  if (reply === "replied" || reply === "y") {
    genuineReplies += 1;
    repliedLeads.add(row[0]);
  }
  if (reply === "unsubscribed") optOuts += 1;
  if (status === "Interested" || status === "Committed") {
    engagedLeadNumbers.add(row[0]);
    engagedLeads.push({ lead: row[0], gym: row[1], status, contacted: row[18] });
  }
}

// --- Send Log: A=Lead #, D=Date Sent, N=Variant (A/B on the first-touch row,
// FU1/FU2 on a follow-up's own row — each actual send is its own row),
// Q=Subject Variant (first-touch only). "Follow-up Sent (Y/N)" flags (H, P) are
// a per-lead summary, not per-send, so counting rows is the accurate way to
// size volume.
const sendRows = await values(token, "Send Log!A2:Q10000");
let totalSendRows = 0;
let sentThisWeek = 0;
const rowTypeCounts = { firstTouch: 0, fu1: 0, fu2: 0, other: 0 };
const rowTypeThisWeek = { firstTouch: 0, fu1: 0, fu2: 0, other: 0 };
const variantCounts = {}; // A / B, first-touch CTA framing
const subjectVariantCounts = {}; // S1 / S2, first-touch subject line
const firstTouches = [];
for (const row of sendRows) {
  const dateSent = row[3];
  if (!dateSent) continue;
  totalSendRows += 1;
  const recent = isRecent(dateSent);
  if (recent) sentThisWeek += 1;
  const variant = (row[13] ?? "").trim();
  // Any body variant letter is a first touch (A/B for T0, A/V for T2 from
  // 2026-09-14); FU1/FU2 are follow-ups; blank predates the Variant column.
  const bucket = variant === "FU1" ? "fu1" : variant === "FU2" ? "fu2" : /^[A-Z]$/.test(variant) ? "firstTouch" : "other";
  rowTypeCounts[bucket] += 1;
  if (recent) rowTypeThisWeek[bucket] += 1;
  const subjectVariant = (row[16] ?? "").trim();
  if (bucket === "firstTouch") {
    variantCounts[variant] = (variantCounts[variant] ?? 0) + 1;
    firstTouches.push({ lead: row[0], date: dateSent, variant, subject: subjectVariant });
  }
  if (subjectVariant) subjectVariantCounts[subjectVariant] = (subjectVariantCounts[subjectVariant] ?? 0) + 1;
}

/** Dates Davide types by hand come back as he typed them: 16/09/2026 as often
 *  as 2026-09-16. Day first, European style, when it isn't ISO. */
const parseDate = (text) => {
  const s = (text ?? "").trim();
  if (!s) return null;
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  const t = dmy ? Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1]) : Date.parse(s);
  return Number.isNaN(t) ? null : t;
};
const recentDate = (text) => {
  const t = parseDate(text);
  return t !== null && t >= weekAgo;
};

/** A tab that may not exist yet reads as null rather than failing the run. */
async function optionalValues(range) {
  try {
    return await values(token, range);
  } catch {
    return null;
  }
}

// --- IG Outreach (cold DMs, sent by hand): H=Draft DM, I=Status, J=Date Sent,
// K=Reply?, P=FU1 Sent?, S=FU2 Sent? ---
const igRows = await values(token, "IG Outreach!A2:S3000");
let igSentTotal = 0;
let igSentThisWeek = 0;
let igReplies = 0;
let igFu1Sent = 0;
let igFu2Sent = 0;
let igUnsentDrafts = 0;
for (const row of igRows) {
  const dateSent = row[9];
  if (dateSent) {
    igSentTotal += 1;
    if (isRecent(dateSent) || recentDate(dateSent)) igSentThisWeek += 1;
  } else if ((row[7] ?? "").trim()) {
    igUnsentDrafts += 1;
  }
  const reply = (row[10] ?? "").trim().toLowerCase();
  if (reply && reply !== "n" && reply !== "no") igReplies += 1;
  if ((row[15] ?? "").trim()) igFu1Sent += 1;
  if ((row[18] ?? "").trim()) igFu2Sent += 1;
}

// --- Instagram content (content-plan.md, tabs added 2026-09-13) ---
// IG Content: A=#, B=Planned date, I=Status, K=Posted (date).
const CONTENT_START = Date.UTC(2026, 8, 16); // first post, 2026-09-16
const contentRows = await optionalValues("IG Content!A2:L2000");
let igContent = null;
if (contentRows) {
  const posted = contentRows.filter((row) => parseDate(row[10]) !== null);
  const status = (row) => (row[8] ?? "").trim().toLowerCase();
  const daysIn = Math.floor((now - CONTENT_START) / DAY) + 1;
  const expectedSoFar = Math.max(0, Math.min(daysIn, 100));
  igContent = {
    day: daysIn > 0 ? Math.min(daysIn, 100) : null,
    startsOn: "2026-09-16",
    postsInSheet: contentRows.filter((row) => row[0]).length,
    postedTotal: posted.length,
    postedThisWeek: posted.filter((row) => recentDate(row[10])).length,
    expectedSoFar,
    behindBy: Math.max(0, expectedSoFar - posted.length),
    awaitingReview: contentRows.filter((row) => row[0] && !parseDate(row[10]) && /draft|changes/.test(status(row))).length,
    approvedNotPosted: contentRows.filter((row) => row[0] && !parseDate(row[10]) && status(row) === "approved").length,
    feedbackOpen: contentRows.filter((row) => (row[9] ?? "").trim() && !parseDate(row[10]) && /changes/.test(status(row))).map((row) => ({ post: row[0], feedback: row[9] })),
  };
}

// Inbound DMs: A=Date, B=Handle, C=Gym, F=Came from, G=Video sent, H=Status.
// Every gym that asks for the video on Instagram. Interested or Committed is an
// engaged lead, the same definition as the email side.
const dmRows = await optionalValues("Inbound DMs!A2:I2000");
let inboundDms = null;
if (dmRows) {
  const rows = dmRows.filter((row) => row[0] || row[1]);
  const engagedRow = (row) => /interested|committed/i.test(row[7] ?? "");
  inboundDms = {
    total: rows.length,
    thisWeek: rows.filter((row) => recentDate(row[0])).length,
    engagedTotal: rows.filter(engagedRow).length,
    engagedThisWeek: rows.filter((row) => engagedRow(row) && recentDate(row[0])).length,
    videoNotSentYet: rows.filter((row) => !(row[6] ?? "").trim()).map((row) => ({ handle: row[1], gym: row[2], date: row[0] })),
    thisWeekList: rows.filter((row) => recentDate(row[0])).map((row) => ({ handle: row[1], gym: row[2], cameFrom: row[5], status: row[7] })),
  };
}

// IG Weekly: A=Week ending, B=Followers, C=Accounts reached, D=Profile visits.
const weeklyRows = await optionalValues("IG Weekly!A2:E500");
let igWeekly = null;
if (weeklyRows) {
  const num = (text) => {
    const n = Number(String(text ?? "").replace(/[^\d.]/g, ""));
    return String(text ?? "").trim() === "" || Number.isNaN(n) ? null : n;
  };
  const rows = weeklyRows
    .filter((row) => parseDate(row[0]) !== null)
    .sort((a, b) => parseDate(a[0]) - parseDate(b[0]))
    .map((row) => ({ weekEnding: row[0], followers: num(row[1]), reached: num(row[2]), profileVisits: num(row[3]) }));
  const latest = rows.at(-1) ?? null;
  const previous = rows.at(-2) ?? null;
  const growth = (key) => (latest?.[key] != null && previous?.[key] ? +(((latest[key] - previous[key]) / previous[key]) * 100).toFixed(1) : null);
  igWeekly = {
    latest,
    previous,
    followerGrowthPct: growth("followers"),
    reachGrowthPct: growth("reached"),
    // Filled on Saturday; a latest row older than 8 days means this week's is missing.
    missingThisWeek: !latest || now - parseDate(latest.weekEnding) > 8 * DAY,
  };
}

// --- Test Log + the weekly test review ---

/** Two-sided p-value of a two-proportion z-test, or null when it cannot be
 *  computed (an empty arm, or no replies anywhere). Normal CDF by the
 *  Abramowitz-Stegun approximation, ample for a go/no-go call. */
function twoProportionP(r1, n1, r2, n2) {
  if (!n1 || !n2) return null;
  const pooled = (r1 + r2) / (n1 + n2);
  if (pooled === 0 || pooled === 1) return null;
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  const z = Math.abs(r1 / n1 - r2 / n2) / se;
  const t = 1 / (1 + 0.2316419 * z);
  const density = 0.3989423 * Math.exp((-z * z) / 2);
  const tail = density * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return +(2 * tail).toFixed(3);
}

/** "S1 = \"quick question…\"" → "S1". */
const armKey = (text) => (text ?? "").split("=")[0].trim() || null;
const ARM_LETTERS = ["A", "B", "C"];
/** Replies this low cannot separate two arms, whatever the rates say. */
const MIN_REPLIES_TO_CALL = 10;

const testRows = await values(token, "Test Log!A2:W50");
const testLog = testRows
  .filter((row) => row[0])
  .map((row) => {
    const entry = {
      id: row[0],
      weekStarted: row[1],
      weekEnded: row[2] || null,
      asset: row[3],
      component: row[4],
      hypothesis: row[5] || null,
      variantA: row[6],
      variantB: row[7],
      variantC: row[8] || null,
      winner: row[18],
      decision: row[19] || null,
      weeksUnbeaten: row[20],
      status: row[21],
      notes: row[22] || null,
    };
    if ((row[21] ?? "").trim().toLowerCase() !== "running") return entry;

    // Which Send Log column tells the arms apart: the subject variant for a
    // subject-line test, the body/CTA variant otherwise.
    const column = /subject/i.test(row[4] ?? "") ? "subject" : "variant";
    const since = Date.parse(row[1]);
    const arms = [row[6], row[7], row[8]]
      .map((text, index) => ({ key: armKey(text), letter: ARM_LETTERS[index] }))
      .filter((arm) => arm.key)
      .map(({ key, letter }) => {
        const sends = firstTouches.filter(
          (ft) => ft[column] === key && (Number.isNaN(since) || Date.parse(ft.date) >= since),
        );
        // A reply is credited to the arm of the lead's first touch, even when
        // it came in after a follow-up: the first touch is what the test varied.
        const leads = new Set(sends.map((ft) => ft.lead));
        const replies = [...leads].filter((lead) => repliedLeads.has(lead)).length;
        const engaged = [...leads].filter((lead) => engagedLeadNumbers.has(lead)).length;
        return { letter, key, sends: sends.length, replies, replyRatePct: pct(replies, sends.length), engaged };
      });

    const totalReplies = arms.reduce((sum, arm) => sum + arm.replies, 0);
    const pValue = arms.length >= 2 ? twoProportionP(arms[0].replies, arms[0].sends, arms[1].replies, arms[1].sends) : null;
    const leader = [...arms].sort((a, b) => (b.replyRatePct ?? 0) - (a.replyRatePct ?? 0))[0] ?? null;
    const tied = arms.length >= 2 && arms[0].replyRatePct === arms[1].replyRatePct;

    let verdict;
    if (totalReplies < MIN_REPLIES_TO_CALL) {
      verdict = `too few replies to call (${totalReplies} across all arms, want ${MIN_REPLIES_TO_CALL}+)`;
    } else if (pValue !== null && pValue < 0.05) {
      verdict = `${leader.key} wins (p=${pValue})`;
    } else if (tied) {
      verdict = "dead heat";
    } else {
      verdict = `${leader.key} leads but not significantly (p=${pValue})`;
    }

    // Last review = the Week ended date if one was ever written, else the start.
    const lastReviewed = Date.parse(row[2] || row[1]);
    const daysSinceReview = Number.isNaN(lastReviewed) ? null : Math.floor((now - lastReviewed) / DAY);

    const proposedTestLogUpdate = { "Week ended": today };
    for (const arm of arms) {
      proposedTestLogUpdate[`Sends ${arm.letter}`] = String(arm.sends);
      proposedTestLogUpdate[`Replies ${arm.letter}`] = String(arm.replies);
      proposedTestLogUpdate[`Reply-rate ${arm.letter}`] = arm.replyRatePct === null ? "" : `${arm.replyRatePct}%`;
    }

    return {
      ...entry,
      liveReview: {
        column,
        daysRunning: Number.isNaN(since) ? null : Math.floor((now - since) / DAY),
        daysSinceReview,
        reviewOverdueDays: daysSinceReview === null ? null : Math.max(0, daysSinceReview - 7),
        arms,
        totalReplies,
        pValue,
        leader: leader?.key ?? null,
        verdict,
        proposedTestLogUpdate,
      },
    };
  });

console.log(
  JSON.stringify(
    {
      leads: {
        total: leadsRows.length,
        contacted,
        statusCounts,
        genuineReplies,
        optOuts,
        genuineReplyRatePct: pct(genuineReplies, contacted),
        engaged: engagedLeads.length,
        engagedRatePct: pct(engagedLeads.length, contacted),
        engagedLeads,
      },
      sendLog: { totalSendRows, sentThisWeek, rowTypeCounts, rowTypeThisWeek, variantCounts, subjectVariantCounts },
      igOutreach: { igSentTotal, igSentThisWeek, igReplies, igFu1Sent, igFu2Sent, igUnsentDrafts },
      igContent,
      inboundDms,
      igWeekly,
      testLog,
    },
    null,
    1,
  ),
);
