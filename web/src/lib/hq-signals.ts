import type { MarketingSummary } from "./marketing-summary";

/**
 * To-dos that come from the live state of the business rather than from
 * anybody writing them down (IMPROVEMENTS.md #4). Worked out on every /admin
 * load, so each one appears when its condition arises and disappears when the
 * condition is gone.
 *
 * Each has a `key` that names the situation, not the moment: ticking one off
 * stores that key (hq_todos.signal_key), and it stays ticked for as long as
 * the same situation lasts. A new situation gets a new key, so a test review
 * due next week is a new to-do even though this week's was ticked.
 *
 * Replies Davide sends himself are not logged anywhere casdey can read, so
 * "reply to this gym" cannot tell when it has been done. It stays until he
 * ticks it, which is also the honest reading: only he knows.
 *
 * Pure: everything comes in as arguments, so it is tested without a
 * database (hq-signals.test.ts).
 */

export type Signal = {
  key: string;
  title: string;
  detail: string | null;
  link: string | null;
  /**
   * When it needs doing, as YYYY-MM-DD, where the situation has a natural
   * date: a review's due day, a first week's last day, the first day with no
   * Instagram post approved. Null where it simply needs doing (a reply).
   */
  due: string | null;
  /** Lower sorts first. */
  priority: number;
};

export type TrialEnding = {
  gymId: string;
  gymName: string;
  endsAt: string;
};

export type GoalRef = {
  id: string;
  label: string;
  deadline: string | null;
  status: string;
};

const LEADS_SHEET =
  "https://docs.google.com/spreadsheets/d/1WOAIA1gvK6S1kWe_Vf4-d4XmjhnDLQZLtyU_ezvOu3w/edit";

const shortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export function liveSignals(input: {
  marketing: MarketingSummary | null;
  trialsEnding: TrialEnding[];
  goals: GoalRef[];
  now: Date;
}): Signal[] {
  const { marketing, trialsEnding, goals, now } = input;
  const today = now.toISOString().slice(0, 10);
  const signals: Signal[] = [];

  if (marketing) {
    for (const lead of marketing.engagedLeads) {
      signals.push({
        key: `lead:${lead.lead}`,
        title: `Follow up with ${lead.gym || `lead #${lead.lead}`}`,
        detail: `${lead.status} gym, lead #${lead.lead}${lead.contacted ? `, first contacted ${shortDate(lead.contacted)}` : ""}. Tick this off once you have replied or they have moved on.`,
        link: LEADS_SHEET,
        due: null,
        priority: 0,
      });
    }

    for (const dm of marketing.inboundDms?.videoNotSentYet ?? []) {
      signals.push({
        key: `dm-video:${dm.handle}`,
        title: `Send the video to ${dm.handle}${dm.gym ? ` (${dm.gym})` : ""}`,
        detail: "They asked for it on Instagram. Log the date in Inbound DMs once it is sent.",
        link: LEADS_SHEET,
        due: null,
        priority: 0,
      });
    }

    for (const test of marketing.runningTests) {
      if (!test.reviewDueOn || test.reviewDueOn > today) continue;
      signals.push({
        key: `test-review:${test.id}:${test.reviewDueOn}`,
        title: `Weekly review of test ${test.id}`,
        detail: `${test.verdict}. Due ${shortDate(test.reviewDueOn)}${test.reviewOverdueDays ? `, ${test.reviewOverdueDays} day${test.reviewOverdueDays === 1 ? "" : "s"} overdue` : ""}. Part of the Sunday check-up.`,
        link: "/admin?tab=marketing",
        due: test.reviewDueOn,
        priority: 1,
      });
    }

    // The 100-day Instagram cadence is retired since 2026-09-20 (Davide's
    // call): the posts were weak for reasons tooling cannot fix, and the
    // research behind the plan had already found Instagram to be a side
    // channel for every gym-software account profiled. What is left is three
    // pinned posts, so a gym owner who gets a cold email and checks the
    // profile finds something real. Nothing is scheduled, so this signal
    // would otherwise ask for a batch every single day. Set back to false to
    // restart a cadence.
    const IG_CADENCE_RETIRED = true;
    const uncovered = IG_CADENCE_RETIRED
      ? []
      : (marketing.igContent?.uncoveredNextDays ?? []);
    if (uncovered.length > 0) {
      signals.push({
        key: `ig-approve:${uncovered[0]}`,
        title: "Approve Instagram posts",
        detail: `Nothing approved yet for ${uncovered.map(shortDate).join(", ")}. Set Status to Approved in IG Content, or ask Claude for the next batch.`,
        link: LEADS_SHEET,
        due: uncovered[0],
        priority: 1,
      });
    }

    // Instagram DMs are paused since 2026-09-20 (Davide's call): 397 messages
    // bought 1 reply and 0 engaged leads, and every one of them costs an hour
    // of the only pair of hands casdey has. The drafts already in the sheet are
    // deliberately left unsent, so this signal would otherwise nag every day.
    // Set back to false, and re-enable the "casdey gym IG outreach" routine, to
    // restart the channel. Posting to Instagram is unaffected.
    const IG_DMS_PAUSED = true;
    const drafts = IG_DMS_PAUSED ? 0 : (marketing.igOutreach?.unsentDrafts ?? 0);
    if (drafts > 0) {
      signals.push({
        key: `ig-dms:${today}`,
        title: `Send ${drafts} Instagram DM${drafts === 1 ? "" : "s"}`,
        detail: "Drafted in IG Outreach. Log the date in Date Sent as each goes out.",
        link: LEADS_SHEET,
        due: today,
        priority: 2,
      });
    }
  }

  for (const trial of trialsEnding) {
    signals.push({
      key: `trial:${trial.gymId}:${trial.endsAt.slice(0, 10)}`,
      title: `${trial.gymName}'s first week ends ${shortDate(trial.endsAt)}`,
      detail: "Check they have imported and launched a campaign before it ends.",
      link: null,
      due: trial.endsAt.slice(0, 10),
      priority: 1,
    });
  }

  for (const goal of goals) {
    if (goal.status !== "active" || !goal.deadline || goal.deadline >= today) continue;
    signals.push({
      key: `goal:${goal.id}`,
      title: `Close out the goal "${goal.label}" and set the next one`,
      detail: `Its deadline was ${shortDate(goal.deadline)}. Decide in the Sunday review whether it was hit.`,
      link: null,
      due: goal.deadline,
      priority: 1,
    });
  }

  // The Sunday check-up is one of Davide's standing inputs. Shown on Sunday,
  // and on Monday too if Sunday's did not happen.
  const day = now.getUTCDay();
  if (day === 0 || day === 1) {
    const sunday = new Date(now.getTime() - day * 86_400_000).toISOString().slice(0, 10);
    signals.push({
      key: `checkup:${sunday}`,
      title: "Sunday check-up with Claude",
      detail: "Run /check-up: the weekly test review, this week's goals, and next week's actions.",
      link: "/admin?tab=checkup",
      due: sunday,
      priority: 1,
    });
  }

  return signals.sort((a, b) => a.priority - b.priority);
}
