import { normalizeRow } from "./csv";
import type { ColumnMapping, DateFormat, ParseResult } from "./types";

export type ImportReadiness = {
  /** One result per sampled row, in file order, for the preview to slice. */
  results: ParseResult[];
  /** How many sampled rows read as a member. */
  readable: number;
  /**
   * Why the import cannot start yet, in words a gym owner can act on, or null
   * when it can. A disabled button that says nothing looks broken: the first
   * real gym to try an import reported exactly that ("it doesn't do anything").
   */
  blocker: string | null;
};

/**
 * Decides whether the import button should be live, and if not, why.
 *
 * It judges the whole sample, not just the five rows the preview shows. An
 * attendance export can open with members who have no visit in the period
 * (blank last visit), and blocking the entire file because rows 2 to 6 are
 * blank stops an import whose later rows are fine. The server skips unreadable
 * rows and reports them, so all that has to be true here is that something in
 * the file can be imported.
 */
export function importReadiness(
  sample: Record<string, string>[],
  mapping: Partial<ColumnMapping>,
  dateFormat: DateFormat,
): ImportReadiness {
  const column = mapping.lastVisitAt;
  if (!column) {
    return {
      results: [],
      readable: 0,
      blocker:
        "Choose the column that holds each member's last visit date, above, and the import unlocks.",
    };
  }

  const full = mapping as ColumnMapping;
  const results = sample.map((row, index) =>
    normalizeRow(row, full, dateFormat, index + 2),
  );
  const readable = results.filter((result) => result.ok).length;
  if (readable > 0) return { results, readable, blocker: null };

  if (results.length === 0) {
    return {
      results,
      readable,
      blocker: "We could not find any rows in that file.",
    };
  }

  const firstIssue = results.find((result) => !result.ok);
  const empty =
    firstIssue && !firstIssue.ok && firstIssue.issue.reason === "No last visit date";
  const cause = empty
    ? `The "${column}" column is empty in all ${results.length} rows we checked.`
    : `We could not read a date from the "${column}" column in any of the ${results.length} rows we checked${
        firstIssue && !firstIssue.ok ? ` (${firstIssue.issue.reason})` : ""
      }.`;

  return {
    results,
    readable,
    blocker: `${cause} Pick a different column for "Last visit" above, or check that your file has a last visit date for each member.`,
  };
}
