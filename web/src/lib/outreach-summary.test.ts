import { describe, expect, it } from "vitest";

import { summariseOutreach } from "./outreach-summary";

/** A Leads row: # (A), gym (B), status (R), date contacted (S), reply (U). */
function lead(
  number: string,
  gym: string,
  status: string,
  dateContacted: string,
  reply = "",
): string[] {
  const row = Array<string>(21).fill("");
  row[0] = number;
  row[1] = gym;
  row[17] = status;
  row[18] = dateContacted;
  row[20] = reply;
  return row;
}

function send(dateSent: string): string[] {
  return ["1", "Gym", "a@b.c", dateSent];
}

const now = new Date("2026-09-13T10:00:00Z");
const DAY_MS = 86_400_000;
const from = (days: number) => new Date(now.getTime() - days * DAY_MS);

describe("summariseOutreach", () => {
  const leads = [
    lead("1", "Iron Box", "Contacted", "2026-09-10"),
    lead("2", "BodyActive", "Interested", "2026-08-30", "Replied"),
    lead("3", "CrossFit No", "Dead", "2026-08-24", "Replied"),
    lead("4", "Opted Out Gym", "Dead", "2026-08-24", "Unsubscribed"),
    lead("5", "Not Yet", "Not contacted", ""),
    lead("6", "", "", ""),
  ];

  it("keeps engaged leads apart from replies", () => {
    const summary = summariseOutreach(leads, [], from(7), now);
    expect(summary.contacted).toBe(4);
    expect(summary.genuineReplies).toBe(2);
    expect(summary.optOuts).toBe(1);
    expect(summary.engaged).toBe(1);
    expect(summary.engagedGyms).toEqual(["BodyActive"]);
    expect(summary.replyRate).toBe(50);
    expect(summary.engagedRate).toBe(25);
  });

  it("does not count an opt-out as a reply", () => {
    const summary = summariseOutreach(
      [lead("4", "Opted Out Gym", "Dead", "2026-08-24", "Unsubscribed")],
      [],
      from(7),
      now,
    );
    expect(summary.genuineReplies).toBe(0);
    expect(summary.replyRate).toBe(0);
  });

  it("splits contacts and sends into the period and the one before", () => {
    const summary = summariseOutreach(
      leads,
      [send("2026-09-12"), send("2026-09-07"), send("2026-09-01"), send("")],
      from(7),
      now,
    );
    expect(summary.contactedInPeriod).toBe(1);
    expect(summary.contactedPrevious).toBe(0);
    expect(summary.emailsSentInPeriod).toBe(2);
    expect(summary.emailsSentPrevious).toBe(1);
  });

  it("has no rate when nobody has been contacted", () => {
    const summary = summariseOutreach([], [], from(7), now);
    expect(summary.replyRate).toBeNull();
    expect(summary.engagedRate).toBeNull();
  });
});
