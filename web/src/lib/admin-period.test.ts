import { describe, expect, it } from "vitest";

import {
  addDaysUTC,
  addMonthsUTC,
  bucketKeyFor,
  periodBuckets,
  priorWindowStart,
  startOfDayUTC,
  startOfMonthUTC,
  startOfQuarterUTC,
  startOfYearUTC,
  weekStartOf,
} from "./admin-period";

describe("calendar boundaries", () => {
  it("finds the Monday of the week", () => {
    // A Wednesday.
    expect(weekStartOf(new Date("2026-09-16T10:00:00Z")).toISOString().slice(0, 10)).toBe(
      "2026-09-14",
    );
    // Already a Monday.
    expect(weekStartOf(new Date("2026-09-14T00:00:00Z")).toISOString().slice(0, 10)).toBe(
      "2026-09-14",
    );
  });

  it("finds the start of the month, quarter and year", () => {
    const d = new Date("2026-09-16T10:00:00Z");
    expect(startOfMonthUTC(d).toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(startOfQuarterUTC(d).toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(startOfYearUTC(d).toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("finds the start of the quarter for every month", () => {
    expect(startOfQuarterUTC(new Date("2026-01-15")).getUTCMonth()).toBe(0);
    expect(startOfQuarterUTC(new Date("2026-04-15")).getUTCMonth()).toBe(3);
    expect(startOfQuarterUTC(new Date("2026-12-31")).getUTCMonth()).toBe(9);
  });

  it("shifts by whole months, crossing a year boundary", () => {
    expect(addMonthsUTC(new Date("2026-01-15"), -1).toISOString().slice(0, 10)).toBe(
      "2025-12-01",
    );
    expect(addMonthsUTC(new Date("2026-01-15"), -3).toISOString().slice(0, 10)).toBe(
      "2025-10-01",
    );
  });

  it("shifts by whole days", () => {
    expect(addDaysUTC(new Date("2026-03-01T00:00:00Z"), -1).toISOString().slice(0, 10)).toBe(
      "2026-02-28",
    );
  });

  it("floors to midnight UTC", () => {
    expect(startOfDayUTC(new Date("2026-09-16T23:59:00Z")).toISOString()).toBe(
      "2026-09-16T00:00:00.000Z",
    );
  });
});

describe("priorWindowStart", () => {
  it("is the same length immediately before the window", () => {
    const from = new Date("2026-09-01T00:00:00Z");
    const to = new Date("2026-09-16T10:00:00Z");
    const previous = priorWindowStart(from, to);
    expect(to.getTime() - from.getTime()).toBe(from.getTime() - previous.getTime());
  });
});

describe("periodBuckets", () => {
  it("splits a week-to-date window into 7 previous days and today's days", () => {
    // Wednesday, 3 days into the week (Mon, Tue, Wed).
    const from = new Date("2026-09-14T00:00:00Z"); // Monday
    const to = new Date("2026-09-16T10:00:00Z"); // Wednesday, mid-morning
    const { all, perSide } = periodBuckets(from, to, "day");
    expect(perSide).toBe(3); // Fri, Sat, Sun before Monday's window start... see below
    expect(all.slice(perSide).map((b) => b.key)).toEqual([
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
    ]);
  });

  it("gives current and previous equal bucket counts for a calendar month", () => {
    const from = startOfMonthUTC(new Date("2026-09-16"));
    const to = new Date("2026-09-16T10:00:00Z");
    const { all, perSide } = periodBuckets(from, to, "day");
    const current = all.slice(perSide);
    const previous = all.slice(0, perSide);
    expect(current.length).toBe(previous.length);
  });

  it("buckets by week beyond the day threshold", () => {
    const from = new Date("2026-07-01T00:00:00Z");
    const to = new Date("2026-09-16T10:00:00Z");
    const { all, perSide } = periodBuckets(from, to, "week");
    expect(all.length).toBeGreaterThan(0);
    expect(perSide).toBeGreaterThan(0);
  });
});

describe("bucketKeyFor", () => {
  it("keys a timestamp to its day or week bucket", () => {
    expect(bucketKeyFor("2026-09-16T14:00:00Z", "day")).toBe("2026-09-16");
    expect(bucketKeyFor("2026-09-16T14:00:00Z", "week")).toBe("2026-09-14");
  });
});
