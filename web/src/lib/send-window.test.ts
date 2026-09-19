import { describe, expect, it } from "vitest";

import { inSendWindow, localHour } from "./send-window";

/** A UTC instant, written plainly. */
const utc = (iso: string) => new Date(`${iso}Z`);

// The cron hours in web/vercel.json. Vercel Hobby fires anywhere inside the
// hour, so each is checked at the top and near the end of it.
const DRAINS = [3, 8, 13, 16, 19];

function sendsDuring(timezone: string, date: string): number[] {
  return DRAINS.filter(
    (hour) =>
      inSendWindow(timezone, utc(`${date}T${String(hour).padStart(2, "0")}:00:00`)) &&
      inSendWindow(timezone, utc(`${date}T${String(hour).padStart(2, "0")}:55:00`)),
  );
}

describe("localHour", () => {
  it("follows daylight saving", () => {
    expect(localHour("America/New_York", utc("2026-07-01T13:00:00"))).toBe(9);
    expect(localHour("America/New_York", utc("2026-01-15T13:00:00"))).toBe(8);
    expect(localHour("Europe/London", utc("2026-07-01T08:00:00"))).toBe(9);
  });
});

describe("inSendWindow", () => {
  it("keeps the old 03:00 UTC drain from emailing Europe at 4am or New York at 11pm", () => {
    const threeAm = utc("2026-09-19T03:10:00");
    expect(inSendWindow("Europe/Dublin", threeAm)).toBe(false);
    expect(inSendWindow("Europe/Rome", threeAm)).toBe(false);
    expect(inSendWindow("America/New_York", threeAm)).toBe(false);
  });

  it("sends from 8am and stops before 8pm local", () => {
    expect(inSendWindow("Europe/London", utc("2026-01-15T07:59:00"))).toBe(false);
    expect(inSendWindow("Europe/London", utc("2026-01-15T08:00:00"))).toBe(true);
    expect(inSendWindow("Europe/London", utc("2026-01-15T19:59:00"))).toBe(true);
    expect(inSendWindow("Europe/London", utc("2026-01-15T20:00:00"))).toBe(false);
  });

  it("falls back to sending when the timezone is missing or broken", () => {
    const now = utc("2026-09-19T03:00:00");
    expect(inSendWindow(null, now)).toBe(true);
    expect(inSendWindow("Not/AZone", now)).toBe(true);
  });

  // The property that matters: every timezone a gym can pick at signup gets
  // at least one drain inside its daytime, in summer and in winter, wherever
  // in its hour Vercel fires it. A zone with none would never send at all.
  const ZONES = [
    "Europe/London",
    "Europe/Dublin",
    "Europe/Lisbon",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Rome",
    "Europe/Madrid",
    "Europe/Amsterdam",
    "Europe/Brussels",
    "Europe/Vienna",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Phoenix",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
  ];
  for (const zone of ZONES) {
    it(`gives ${zone} a daytime drain in summer and winter`, () => {
      expect(sendsDuring(zone, "2026-07-01").length).toBeGreaterThan(0);
      expect(sendsDuring(zone, "2026-01-15").length).toBeGreaterThan(0);
    });
  }
});
