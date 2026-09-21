import { describe, expect, it } from "vitest";

import { importReadiness } from "./import-readiness";

const mapping = { firstName: "Name", email: "Email", lastVisitAt: "Last visit" };

const row = (name: string, lastVisit: string) => ({
  Name: name,
  Email: `${name.toLowerCase()}@example.com`,
  "Last visit": lastVisit,
});

describe("importReadiness", () => {
  it("asks for a last visit column when none is chosen", () => {
    const result = importReadiness([row("Ann", "2026-09-01")], {}, "dmy");
    expect(result.blocker).toMatch(/Choose the column/);
    expect(result.readable).toBe(0);
  });

  it("stays live when only the first rows are blank but later ones read", () => {
    // The first real gym's file: five members with no visit in the period
    // opened the export, and the button was disabled for the whole file.
    const sample = [
      ...Array.from({ length: 5 }, (_, i) => row(`Blank${i}`, "")),
      row("Zoe", "2026-09-10"),
    ];
    const result = importReadiness(sample, mapping, "dmy");
    expect(result.blocker).toBeNull();
    expect(result.readable).toBe(1);
    expect(result.results).toHaveLength(6);
  });

  it("says the column is empty when every row is blank", () => {
    const sample = [row("A", ""), row("B", ""), row("C", "")];
    const result = importReadiness(sample, mapping, "dmy");
    expect(result.blocker).toContain('The "Last visit" column is empty in all 3 rows');
    expect(result.blocker).toContain("Pick a different column");
  });

  it("names the reason when dates exist but cannot be read", () => {
    const sample = [row("A", "yesterday"), row("B", "last week")];
    const result = importReadiness(sample, mapping, "dmy");
    expect(result.blocker).toContain("could not read a date");
    expect(result.blocker).toContain('Could not read "yesterday" as a date');
  });

  it("handles an empty file", () => {
    expect(importReadiness([], mapping, "dmy").blocker).toBe(
      "We could not find any rows in that file.",
    );
  });
});
