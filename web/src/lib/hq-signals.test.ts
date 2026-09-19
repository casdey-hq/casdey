import { describe, expect, it } from "vitest";

import { liveSignals } from "./hq-signals";
import type { MarketingSummary } from "./marketing-summary";

const marketing = (overrides: Partial<MarketingSummary> = {}): MarketingSummary => ({
  engagedLeads: [],
  weekCohort: { contacted: 0, replied: 0, engaged: 0, engagedRatePct: null, replyRatePct: null },
  igOutreach: null,
  igContent: null,
  inboundDms: null,
  igWeekly: null,
  runningTests: [],
  closedTests: [],
  ...overrides,
});

// A Saturday, so the Sunday check-up is not in play unless a test asks for it.
const SATURDAY = new Date("2026-09-19T10:00:00Z");

describe("liveSignals", () => {
  it("makes one to-do per engaged lead, keyed by the lead so ticking it sticks", () => {
    const signals = liveSignals({
      marketing: marketing({
        engagedLeads: [{ lead: "1129", gym: "Yantra Studio", status: "Interested", contacted: "2026-09-16" }],
      }),
      trialsEnding: [],
      goals: [],
      now: SATURDAY,
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({ key: "lead:1129", title: "Follow up with Yantra Studio" });
  });

  it("raises a test review only once it is due, keyed by the due date", () => {
    const test = (reviewDueOn: string) =>
      marketing({
        runningTests: [
          {
            id: "T2",
            weekStarted: "2026-09-14",
            asset: "",
            component: "",
            hypothesis: null,
            variants: [],
            arms: [],
            totalReplies: 3,
            pValue: null,
            leader: null,
            verdict: "Too few replies to call",
            daysRunning: 5,
            reviewOverdueDays: 0,
            reviewDueOn,
            proposedUpdate: {},
          },
        ],
      });
    const early = liveSignals({ marketing: test("2026-09-21"), trialsEnding: [], goals: [], now: SATURDAY });
    expect(early).toEqual([]);
    const due = liveSignals({ marketing: test("2026-09-19"), trialsEnding: [], goals: [], now: SATURDAY });
    expect(due[0].key).toBe("test-review:T2:2026-09-19");
  });

  it("names unapproved Instagram days and unsent DMs, and says nothing when there are none", () => {
    const busy = liveSignals({
      marketing: marketing({
        igContent: {
          day: 4, postedTotal: 4, postedThisWeek: 4, expectedSoFar: 4, behindBy: 0,
          awaitingReview: 0, approvedNotPosted: 0, uncoveredNextDays: ["2026-09-19", "2026-09-20"], feedbackOpen: [],
        },
        igOutreach: { sentTotal: 10, sentThisWeek: 5, replies: 0, fu1Sent: 0, fu2Sent: 0, unsentDrafts: 17 },
      }),
      trialsEnding: [],
      goals: [],
      now: SATURDAY,
    });
    expect(busy.map((s) => s.key)).toEqual(["ig-approve:2026-09-19", "ig-dms:2026-09-19"]);
    expect(busy[1].title).toBe("Send 17 Instagram DMs");

    const quiet = liveSignals({
      marketing: marketing({
        igOutreach: { sentTotal: 10, sentThisWeek: 5, replies: 0, fu1Sent: 0, fu2Sent: 0, unsentDrafts: 0 },
      }),
      trialsEnding: [],
      goals: [],
      now: SATURDAY,
    });
    expect(quiet).toEqual([]);
  });

  it("asks to close a goal whose deadline has passed, and leaves live ones alone", () => {
    const signals = liveSignals({
      marketing: null,
      trialsEnding: [],
      goals: [
        { id: "g1", label: "1% engaged leads a week", deadline: "2026-09-18", status: "active" },
        { id: "g2", label: "2 paying gyms", deadline: "2026-10-13", status: "active" },
        { id: "g3", label: "old", deadline: "2026-09-01", status: "hit" },
      ],
      now: SATURDAY,
    });
    expect(signals.map((s) => s.key)).toEqual(["goal:g1"]);
  });

  it("puts the Sunday check-up on Sunday and Monday, keyed by that Sunday", () => {
    const sunday = liveSignals({ marketing: null, trialsEnding: [], goals: [], now: new Date("2026-09-20T09:00:00Z") });
    const monday = liveSignals({ marketing: null, trialsEnding: [], goals: [], now: new Date("2026-09-21T09:00:00Z") });
    expect(sunday.map((s) => s.key)).toEqual(["checkup:2026-09-20"]);
    expect(monday.map((s) => s.key)).toEqual(["checkup:2026-09-20"]);
    expect(liveSignals({ marketing: null, trialsEnding: [], goals: [], now: SATURDAY })).toEqual([]);
  });

  it("puts replies to interested gyms ahead of routine chores", () => {
    const signals = liveSignals({
      marketing: marketing({
        engagedLeads: [{ lead: "1", gym: "Iron Box", status: "Interested", contacted: "" }],
        igOutreach: { sentTotal: 0, sentThisWeek: 0, replies: 0, fu1Sent: 0, fu2Sent: 0, unsentDrafts: 3 },
      }),
      trialsEnding: [{ gymId: "x", gymName: "BodyActive", endsAt: "2026-09-26T00:00:00Z" }],
      goals: [],
      now: SATURDAY,
    });
    expect(signals.map((s) => s.key)).toEqual(["lead:1", "trial:x:2026-09-26", "ig-dms:2026-09-19"]);
  });
});
