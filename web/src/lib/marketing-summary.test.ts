import { describe, expect, it } from "vitest";

import {
  parseSheetDate,
  summariseMarketing,
  twoProportionP,
  type MarketingTabs,
} from "./marketing-summary";

const NOW = Date.parse("2026-09-19T10:00:00Z");

/** A Leads row with the columns the summary reads, the rest blank. */
function lead(n: string, gym: string, status: string, reply = "", contacted = "2026-09-15") {
  const row = Array(21).fill("");
  row[0] = n;
  row[1] = gym;
  row[17] = status;
  row[18] = contacted;
  row[20] = reply;
  return row;
}

/** A Send Log row: lead, date, variant (N), subject variant (Q). */
function send(n: string, date: string, variant: string, subject = "S1") {
  const row = Array(17).fill("");
  row[0] = n;
  row[3] = date;
  row[13] = variant;
  row[16] = subject;
  return row;
}

function tabs(overrides: Partial<MarketingTabs> = {}): MarketingTabs {
  return {
    leads: [],
    sendLog: [],
    igOutreach: null,
    igContent: null,
    inboundDms: null,
    igWeekly: null,
    testLog: null,
    ...overrides,
  };
}

describe("parseSheetDate", () => {
  it("reads ISO and hand-typed day-first dates", () => {
    expect(parseSheetDate("2026-09-16")).toBe(Date.UTC(2026, 8, 16));
    expect(parseSheetDate("16/09/2026")).toBe(Date.UTC(2026, 8, 16));
    expect(parseSheetDate("")).toBeNull();
    expect(parseSheetDate("soon")).toBeNull();
  });
});

describe("twoProportionP", () => {
  it("is null when an arm is empty or nobody replied", () => {
    expect(twoProportionP(0, 0, 1, 10)).toBeNull();
    expect(twoProportionP(0, 100, 0, 100)).toBeNull();
  });

  it("calls a large difference significant and a small one not", () => {
    expect(twoProportionP(30, 100, 5, 100)!).toBeLessThan(0.05);
    expect(twoProportionP(3, 100, 2, 100)!).toBeGreaterThan(0.05);
  });
});

describe("summariseMarketing", () => {
  it("lists engaged leads, Interested or Committed, by name", () => {
    const summary = summariseMarketing(
      tabs({
        leads: [
          lead("1", "Iron Box", "Interested", "Replied"),
          lead("2", "Quiet Gym", "Contacted"),
          lead("3", "Big Studio", "Committed", "Replied"),
          lead("4", "Never Gym", "Not contacted"),
        ],
      }),
      NOW,
    );
    expect(summary.engagedLeads.map((l) => l.gym)).toEqual(["Iron Box", "Big Studio"]);
  });

  it("credits a reply to the arm of the lead's first touch, and refuses to call a thin test", () => {
    const testRow = Array(23).fill("");
    testRow[0] = "T2";
    testRow[1] = "2026-09-14";
    testRow[3] = "first-touch email";
    testRow[4] = "body";
    testRow[6] = "A = permission";
    testRow[7] = "V = outcome-led";
    testRow[21] = "running";

    const summary = summariseMarketing(
      tabs({
        leads: [lead("1", "Iron Box", "Interested", "Replied"), lead("2", "Quiet", "Contacted")],
        sendLog: [
          send("1", "2026-09-15", "V"),
          send("1", "2026-09-19", "FU1"),
          send("2", "2026-09-15", "A"),
          // Before the test started: not counted.
          send("9", "2026-09-10", "A"),
        ],
        testLog: [testRow],
      }),
      NOW,
    );

    const [test] = summary.runningTests;
    expect(test.arms).toEqual([
      { letter: "A", key: "A", sends: 1, replies: 0, replyRatePct: 0, engaged: 0 },
      { letter: "B", key: "V", sends: 1, replies: 1, replyRatePct: 100, engaged: 1 },
    ]);
    expect(test.verdict).toMatch(/^Too few replies/);
    expect(test.reviewDueOn).toBe("2026-09-21");
    expect(test.reviewOverdueDays).toBe(0);
  });

  it("counts Instagram content against one post a day and names the uncovered next days", () => {
    const post = (n: string, planned: string, status: string, posted = "") => {
      const row = Array(12).fill("");
      row[0] = n;
      row[1] = planned;
      row[8] = status;
      row[10] = posted;
      return row;
    };
    const summary = summariseMarketing(
      tabs({
        igContent: [
          post("001", "2026-09-16", "Posted", "2026-09-16"),
          post("002", "2026-09-16", "Posted", "2026-09-16"),
          post("003", "2026-09-17", "Posted", "2026-09-17"),
          post("004", "2026-09-18", "Posted", "2026-09-18"),
          post("005", "2026-09-20", "Approved"),
          post("006", "2026-09-21", "Draft"),
        ],
      }),
      NOW,
    );
    // Day 4 of the plan, four posts out.
    expect(summary.igContent).toMatchObject({ day: 4, postedTotal: 4, behindBy: 0, awaitingReview: 1, approvedNotPosted: 1 });
    // Today (19th) has nothing, the 20th is approved, the 21st is only a draft.
    expect(summary.igContent!.uncoveredNextDays).toEqual(["2026-09-19", "2026-09-21"]);
  });

  it("names inbound DMs still waiting for the video, but not dead ones", () => {
    const dm = (handle: string, video: string, status: string) => {
      const row = Array(9).fill("");
      row[0] = "2026-09-18";
      row[1] = handle;
      row[2] = "A Gym";
      row[6] = video;
      row[7] = status;
      return row;
    };
    const summary = summariseMarketing(
      tabs({
        inboundDms: [dm("@a", "", "Interested"), dm("@b", "2026-09-18", "Interested"), dm("@c", "", "Dead")],
      }),
      NOW,
    );
    expect(summary.inboundDms!.videoNotSentYet.map((d) => d.handle)).toEqual(["@a"]);
  });

  it("measures the weekly cohort on gyms first contacted in the last seven days", () => {
    const summary = summariseMarketing(
      tabs({
        leads: [
          lead("1", "New Box", "Interested", "Replied", "2026-09-17"),
          lead("2", "New Gym", "Contacted", "", "2026-09-18"),
          lead("3", "New Studio", "Contacted", "Replied", "2026-09-16"),
          lead("4", "Old Box", "Interested", "Replied", "2026-08-30"),
        ],
      }),
      NOW,
    );
    expect(summary.weekCohort).toEqual({
      contacted: 3,
      replied: 2,
      engaged: 1,
      engagedRatePct: 33.33,
      replyRatePct: 66.67,
    });
  });

  it("reads missing tabs as null rather than zero", () => {
    const summary = summariseMarketing(tabs(), NOW);
    expect(summary.igOutreach).toBeNull();
    expect(summary.igContent).toBeNull();
    expect(summary.runningTests).toEqual([]);
  });
});
