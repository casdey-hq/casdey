import { describe, expect, it } from "vitest";

import { IMPORT_REFRESH_DAYS, importRefreshReminder } from "./import-reminder";

describe("importRefreshReminder", () => {
  const today = new Date("2026-09-19T10:00:00.000Z");

  it("waits until a full four weeks have passed", () => {
    expect(importRefreshReminder("2026-08-23T23:30:00.000Z", today)).toBeNull();
    expect(importRefreshReminder("2026-08-22T10:00:00.000Z", today)).toEqual({
      daysSinceImport: IMPORT_REFRESH_DAYS,
    });
  });

  it("counts whole UTC days and ignores invalid or future dates", () => {
    expect(importRefreshReminder("2026-08-01T10:00:00.000Z", today)).toEqual({
      daysSinceImport: 49,
    });
    expect(importRefreshReminder("not-a-date", today)).toBeNull();
    expect(importRefreshReminder("2026-09-20T10:00:00.000Z", today)).toBeNull();
  });
});
