import { describe, expect, it } from "vitest";

import { duePosts, isReel, parseSheetDate, romeDate, weeklyRowDue } from "./instagram-schedule";

/** An IG Content row: # (A), planned (B), format (D), caption (G), status (I), posted (K). */
function post(id: string, planned: string, status: string, posted = "", caption = `caption ${id}`, format = "Carousel"): string[] {
  const row = Array<string>(12).fill("");
  row[0] = id;
  row[1] = planned;
  row[3] = format;
  row[6] = caption;
  row[8] = status;
  row[10] = posted;
  return row;
}

describe("parseSheetDate", () => {
  it("reads ISO and day-first dates", () => {
    expect(parseSheetDate("2026-09-16")).toBe("2026-09-16");
    expect(parseSheetDate("16/09/2026")).toBe("2026-09-16");
    expect(parseSheetDate("6.9.2026")).toBe("2026-09-06");
  });

  it("returns null for blanks and words", () => {
    expect(parseSheetDate("")).toBeNull();
    expect(parseSheetDate(undefined)).toBeNull();
    expect(parseSheetDate("tomorrow")).toBeNull();
  });
});

describe("romeDate", () => {
  it("uses Italian time, not UTC", () => {
    // 23:30 UTC on the 15th is already the 16th in Rome (CEST, UTC+2).
    expect(romeDate(new Date("2026-09-15T23:30:00Z"))).toBe("2026-09-16");
  });
});

describe("duePosts", () => {
  it("publishes only approved, unposted posts planned today or earlier", () => {
    const rows = [
      post("001", "2026-09-16", "Approved"),
      post("002", "2026-09-16", "Draft"),
      post("003", "2026-09-17", "Approved"),
      post("004", "2026-09-15", "Approved", "2026-09-15"),
      post("005", "2026-09-16", "Changes requested"),
    ];
    expect(duePosts(rows, "2026-09-16").map((p) => p.id)).toEqual(["001"]);
  });

  it("catches up oldest first and caps the run", () => {
    const rows = [
      post("010", "2026-09-18", "Approved"),
      post("008", "2026-09-16", "approved"),
      post("009", "2026-09-17", "Approved"),
      post("007", "2026-09-15", "Approved"),
    ];
    expect(duePosts(rows, "2026-09-18").map((p) => p.id)).toEqual(["007", "008", "009"]);
  });

  it("gives the sheet row number and caption for writing back", () => {
    const rows = [post("001", "16/09/2026", "Approved", "", "hello")];
    expect(duePosts(rows, "2026-09-16")).toEqual([{ rowNumber: 2, id: "001", planned: "2026-09-16", caption: "hello", format: "Carousel" }]);
  });

  it("carries the format so a reel is published as a reel", () => {
    const [reel, carousel] = duePosts([post("001", "2026-09-16", "Approved", "", "c", " Reel "), post("002", "2026-09-16", "Approved")], "2026-09-16");
    expect(isReel(reel)).toBe(true);
    expect(isReel(carousel)).toBe(false);
    expect(isReel({ format: "" })).toBe(false);
  });

  it("skips rows with no usable planned date", () => {
    expect(duePosts([post("001", "soon", "Approved")], "2026-09-16")).toEqual([]);
  });
});

describe("weeklyRowDue", () => {
  it("is due on Saturday for the next day's Sunday", () => {
    expect(weeklyRowDue([], "2026-09-19")).toBe("2026-09-20");
  });

  it("catches up on Sunday", () => {
    expect(weeklyRowDue([], "2026-09-20")).toBe("2026-09-20");
  });

  it("is not due once that Sunday has a row, however it was typed", () => {
    expect(weeklyRowDue([["20/09/2026", "12"]], "2026-09-19")).toBeNull();
  });

  it("is never due midweek", () => {
    expect(weeklyRowDue([], "2026-09-16")).toBeNull();
  });
});
