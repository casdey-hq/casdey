import "server-only";

/**
 * Date-bucket maths shared by the two /admin data modules (admin-stats.ts for
 * casdey's own tables, posthog-query.ts for PostHog). Kept in its own file so
 * posthog-query does not have to import admin-stats (which pulls in the Stripe
 * SDK) just to line its visitor chart up with the signup chart.
 *
 * The period itself — how a URL like `?r=month` becomes a concrete
 * `{ from, to }` window — lives in src/app/admin/parts.tsx, which is the
 * client-safe half (URL parsing + the nav UI); this file only carries the
 * calendar arithmetic (start-of-month/quarter/year, etc.) and the pure
 * "turn a window into a gap-free list of chart anchors" logic, so both halves
 * of /admin (and posthog-query) share one definition of what a bucket is.
 */

/** Monday of the week containing this date, in UTC. */
export function weekStartOf(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
}

/** Midnight UTC of this date. */
export function startOfDayUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** The 1st of the calendar month containing this date, in UTC. */
export function startOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** The 1st of the calendar quarter (Jan/Apr/Jul/Oct) containing this date. */
export function startOfQuarterUTC(date: Date): Date {
  const quarter = Math.floor(date.getUTCMonth() / 3);
  return new Date(Date.UTC(date.getUTCFullYear(), quarter * 3, 1));
}

/** 1 January of the calendar year containing this date, in UTC. */
export function startOfYearUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

/** `date` shifted by whole calendar months (may cross a year boundary),
 *  always landing on the 1st. */
export function addMonthsUTC(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

/** `date` shifted by whole days. */
export function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "5 Sept" — reads fine for both a day and a week-starting-Monday. */
export const DATE_LABEL = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export type PeriodPoint = { key: string; label: string };

/**
 * The comparison window for any `{ from, to }` period: the same length,
 * immediately before it. Calendar-agnostic on purpose — "vs the period
 * before" for a custom 45-day window is the 45 days before it, and for a
 * completed calendar month it is (very nearly) the calendar month before,
 * without needing month/quarter/year-specific comparison logic of their own.
 */
export function priorWindowStart(from: Date, to: Date): Date {
  return new Date(from.getTime() - (to.getTime() - from.getTime()));
}

/**
 * A gap-free list of bucket anchors covering the comparison window AND the
 * window itself, oldest first, aligned to real calendar boundaries (midnight
 * for a day bucket, Monday for a week bucket) rather than back-computed from
 * a day count — the only way "this month" and "this quarter" bucket
 * correctly. `perSide` is how many anchors belong to the comparison half, so a
 * caller slices `all.slice(perSide)` for "current" and `all.slice(0,
 * perSide)` for "before".
 */
export function periodBuckets(
  from: Date,
  to: Date,
  bucket: "day" | "week",
): { all: PeriodPoint[]; perSide: number } {
  const align = bucket === "day" ? startOfDayUTC : weekStartOf;
  const stepDays = bucket === "day" ? 1 : 7;
  const previousFrom = priorWindowStart(from, to);

  const start = align(previousFrom);
  // The last anchor must cover the final instant of the window: `to` itself
  // is exclusive (it is often "now"), so align the moment just before it.
  const lastCovered = new Date(Math.max(to.getTime() - 1, start.getTime()));
  const end = align(lastCovered);

  const all: PeriodPoint[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + stepDays)) {
    all.push({ key: dayKey(d), label: DATE_LABEL.format(d) });
  }

  const splitKey = dayKey(align(from));
  const perSide = all.filter((b) => b.key < splitKey).length;
  return { all, perSide };
}

/** Which bucket key an ISO timestamp falls into, in the same key space
 *  `periodBuckets` uses. */
export function bucketKeyFor(iso: string, bucket: "day" | "week"): string {
  const d = new Date(iso);
  return bucket === "day" ? dayKey(startOfDayUTC(d)) : dayKey(weekStartOf(d));
}
