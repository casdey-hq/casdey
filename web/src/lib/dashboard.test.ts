import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { calendarToday, customActivityDates, localMidnight } from "./dashboard";

describe("custom dashboard dates", () => {
  const now = new Date("2026-09-21T08:00:00Z");

  it("accepts an inclusive single day and a full year", () => {
    expect(customActivityDates("2026-09-21", "2026-09-21", now)?.days).toBe(1);
    expect(customActivityDates("2025-09-21", "2026-09-21", now)?.days).toBe(366);
  });

  it("rejects invalid, reversed, future, and overlong intervals", () => {
    expect(customActivityDates("2026-02-30", "2026-03-01", now)).toBeNull();
    expect(customActivityDates("2026-09-21", "2026-09-20", now)).toBeNull();
    expect(customActivityDates("2026-09-20", "2026-09-22", now)).toBeNull();
    expect(customActivityDates("2025-09-20", "2026-09-21", now)).toBeNull();
    expect(customActivityDates(["2026-09-01"], "2026-09-21", now)).toBeNull();
  });

  it("uses the gym's calendar date around a timezone boundary", () => {
    const instant = new Date("2026-09-20T22:30:00Z");
    expect(calendarToday(instant, "Europe/Rome")).toBe("2026-09-21");
    expect(customActivityDates("2026-09-21", "2026-09-21", instant, "Europe/Rome")?.days).toBe(1);
    expect(customActivityDates("2026-09-21", "2026-09-21", instant, "Europe/London")).toBeNull();
  });

  it("uses local midnight across daylight-saving changes", () => {
    expect(localMidnight(new Date("2026-03-29T00:00:00Z"), "Europe/Rome").toISOString())
      .toBe("2026-03-28T23:00:00.000Z");
    expect(localMidnight(new Date("2026-03-30T00:00:00Z"), "Europe/Rome").toISOString())
      .toBe("2026-03-29T22:00:00.000Z");
  });
});
