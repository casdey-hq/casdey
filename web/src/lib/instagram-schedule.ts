/**
 * The pure half of the Instagram publisher (content-plan.md): which rows of the
 * IG Content tab are due today, and whether this week's IG Weekly row still
 * needs writing. No network, no clock of its own, so it is tested directly.
 *
 * IG Content columns: A # | B Planned date | C Pillar | D Format | E Hook |
 * F Slides | G Caption | H Images | I Status | J Feedback | K Posted (date) |
 * L Post link.
 */

export type DuePost = {
  /** 1-based sheet row, for writing Posted date and link back. */
  rowNumber: number;
  id: string;
  planned: string;
  caption: string;
};

/** At most this many posts in one run: the plan's launch day is three pinned posts. */
export const MAX_POSTS_PER_RUN = 3;

/**
 * A sheet date as YYYY-MM-DD. Accepts ISO (what the sync script writes) and
 * day-first 16/09/2026 (what a European hand types). Anything else is null.
 */
export function parseSheetDate(text: string | undefined): string | null {
  const s = (text ?? "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return null;
}

/** Today's date in Italy, where the posting time is defined. */
export function romeDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(now);
}

/** 0 = Sunday ... 6 = Saturday, for a YYYY-MM-DD date. */
function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Rows to publish now: Status exactly Approved (Draft and Changes requested
 * never go out), no Posted date yet, planned today or earlier. Oldest first, so
 * a missed day catches up before anything newer, and capped per run.
 */
export function duePosts(rows: string[][], today: string, limit = MAX_POSTS_PER_RUN): DuePost[] {
  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => (row[0] ?? "").trim() !== "")
    .filter(({ row }) => (row[8] ?? "").trim().toLowerCase() === "approved")
    .filter(({ row }) => parseSheetDate(row[10]) === null)
    .map(({ row, rowNumber }) => ({ rowNumber, id: row[0].trim(), planned: parseSheetDate(row[1]), caption: row[6] ?? "" }))
    .filter((post): post is DuePost => post.planned !== null && post.planned <= today)
    .sort((a, b) => a.planned.localeCompare(b.planned) || a.rowNumber - b.rowNumber)
    .slice(0, limit);
}

/**
 * The Sunday this week's IG Weekly row belongs to, if it still needs writing.
 * The check-up reads the tab at 02:00 UTC on Sunday, so the row is written on
 * Saturday's run, with Sunday's run as the catch-up. Any other day, null.
 */
export function weeklyRowDue(weeklyRows: string[][], today: string): string | null {
  const day = weekday(today);
  if (day !== 6 && day !== 0) return null;
  const sunday = day === 6 ? addDays(today, 1) : today;
  const already = weeklyRows.some((row) => parseSheetDate(row[0]) === sunday);
  return already ? null : sunday;
}
