import "server-only";

import { supabaseAdmin } from "./supabase";

/**
 * The last twelve weeks of what casdey actually did, for the dashboard (#48).
 *
 * Three counts, weekly: messages sent, members who came back, and the money
 * those returns were worth. Weekly rather than daily because a gym sends in
 * bursts and a daily chart of a 50-a-day cap is mostly zeroes; twelve because
 * it is a quarter, which is the horizon a gym owner already thinks in.
 *
 * Every series is derived from the same rows the rest of the app counts, not
 * from a summary table. There is no aggregate to drift out of step, and a
 * number on this page can always be traced to the campaign or booking that
 * produced it.
 */

export type WeekPoint = {
  /** Monday of the week, as YYYY-MM-DD. */
  weekStart: string;
  /** Short label for an axis, e.g. "14 Jul". */
  label: string;
  sent: number;
  returned: number;
  revenueMinor: number;
};

/** Monday of the week containing this date, in UTC. */
function weekStartOf(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // getUTCDay is 0 for Sunday, which is the end of the week here, not the start.
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
}

function key(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const LABEL = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export async function weeklyActivity(
  gymId: string,
  weeks = 12,
  now: Date = new Date(),
): Promise<WeekPoint[]> {
  const client = supabaseAdmin();

  const thisWeek = weekStartOf(now);
  const from = new Date(thisWeek);
  from.setUTCDate(from.getUTCDate() - (weeks - 1) * 7);
  const fromIso = from.toISOString();

  // An empty week has to appear as a gap in the bars, not be missing from the
  // axis, so the buckets are built first and the rows dropped into them.
  const buckets = new Map<string, WeekPoint>();
  for (let i = 0; i < weeks; i += 1) {
    const start = new Date(from);
    start.setUTCDate(start.getUTCDate() + i * 7);
    buckets.set(key(start), {
      weekStart: key(start),
      label: LABEL.format(start),
      sent: 0,
      returned: 0,
      revenueMinor: 0,
    });
  }

  const add = (iso: string | null, field: "sent" | "returned", by = 1) => {
    if (!iso) return;
    const bucket = buckets.get(key(weekStartOf(new Date(iso))));
    if (bucket) bucket[field] += by;
  };

  const [messages, returns, bookings] = await Promise.all([
    client
      .from("campaign_messages")
      .select("sent_at")
      .eq("gym_id", gymId)
      .eq("status", "sent")
      .gte("sent_at", fromIso),
    client
      .from("members")
      .select("returned_at")
      .eq("gym_id", gymId)
      .eq("is_test", false)
      .eq("status", "returned")
      .gte("returned_at", fromIso),
    client
      .from("bookings")
      .select("created_at, value_minor, status")
      .eq("gym_id", gymId)
      .neq("status", "cancelled")
      .gte("created_at", fromIso),
  ]);

  for (const row of messages.data ?? []) {
    add(row.sent_at as string | null, "sent");
  }
  for (const row of returns.data ?? []) {
    add(row.returned_at as string | null, "returned");
  }
  for (const row of bookings.data ?? []) {
    const bucket = buckets.get(
      key(weekStartOf(new Date(row.created_at as string))),
    );
    // A booking with no service picked is worth zero rather than a guess, the
    // same rule the headline revenue figure follows. See src/lib/revenue.ts.
    if (bucket) bucket.revenueMinor += (row.value_minor as number | null) ?? 0;
  }

  return [...buckets.values()];
}

export type Totals = { sent: number; returned: number; revenueMinor: number };

export type Period = {
  weeks: WeekPoint[];
  total: Totals;
  /** The same length of time immediately before it, for comparison. */
  previous: Totals;
  /** And week by week, so a chart can draw it behind the current line. */
  previousWeeks: WeekPoint[];
};

function sum(weeks: WeekPoint[]): Totals {
  return weeks.reduce(
    (acc, week) => ({
      sent: acc.sent + week.sent,
      returned: acc.returned + week.returned,
      revenueMinor: acc.revenueMinor + week.revenueMinor,
    }),
    { sent: 0, returned: 0, revenueMinor: 0 },
  );
}

/**
 * The last N weeks, and the N weeks before them.
 *
 * A number on a dashboard means very little on its own: 14 messages is good or
 * bad depending entirely on what last quarter looked like. Fetching double the
 * window and splitting it is one query's worth of work for a figure that
 * actually tells the gym something.
 */
export async function activityWithComparison(
  gymId: string,
  weeks = 12,
  now: Date = new Date(),
): Promise<Period> {
  const all = await weeklyActivity(gymId, weeks * 2, now);
  const current = all.slice(weeks);
  const earlier = all.slice(0, weeks);
  return {
    weeks: current,
    total: sum(current),
    previous: sum(earlier),
    previousWeeks: earlier,
  };
}

/** Exact inclusive calendar dates, UTC. The comparison is the same number of
 * days immediately before the chosen start. Up to a year keeps charts legible
 * and bounds the underlying row reads. */
export function calendarToday(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function customActivityDates(from: unknown, to: unknown, now = new Date(), timezone = "UTC") {
  if (typeof from !== "string" || typeof to !== "string") return null;
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && key(date) === value ? date : null;
  };
  const start = parse(from);
  const end = parse(to);
  const today = new Date(`${calendarToday(now, timezone)}T00:00:00Z`);
  if (!start || !end || start > end || end > today) return null;
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return days <= 366 ? { start, end, days, timezone } : null;
}

export function localMidnight(date: Date, timezone: string): Date {
  const target = date.getTime();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  let instant = target;
  // Re-evaluate the offset at the resulting instant to cover DST transitions.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: string) => Number(parts.find((item) => item.type === type)!.value);
    const wallAsUtc = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
    instant = target - (wallAsUtc - instant);
  }
  return new Date(instant);
}

export async function activityForDates(
  gymId: string,
  dates: NonNullable<ReturnType<typeof customActivityDates>>,
): Promise<Period> {
  const day = 86400000;
  const { start, end, days, timezone } = dates;
  const earlierStart = new Date(start.getTime() - days * day);
  const endExclusive = new Date(end.getTime() + day);
  const client = supabaseAdmin();

  // A page is needed for busy gyms: Supabase limits an unpaged select to 1000
  // rows. A truncated first page would quietly undercount campaign sends.
  async function rows(table: "campaign_messages" | "members" | "bookings", column: string, fields: string) {
    const result: Record<string, unknown>[] = [];
    for (let offset = 0; ; offset += 1000) {
      let query = client.from(table).select(fields).eq("gym_id", gymId)
        .gte(column, localMidnight(earlierStart, timezone).toISOString())
        .lt(column, localMidnight(endExclusive, timezone).toISOString())
        .order(column, { ascending: true }).order("id", { ascending: true }).range(offset, offset + 999);
      if (table === "campaign_messages") query = query.eq("status", "sent");
      if (table === "members") query = query.eq("is_test", false).eq("status", "returned");
      if (table === "bookings") query = query.neq("status", "cancelled");
      const { data, error } = await query;
      if (error) throw error;
      result.push(...((data ?? []) as unknown as Record<string, unknown>[]));
      if (!data || data.length < 1000) break;
    }
    return result;
  }

  const [messages, returns, bookings] = await Promise.all([
    rows("campaign_messages", "sent_at", "sent_at"),
    rows("members", "returned_at", "returned_at"),
    rows("bookings", "created_at", "created_at,value_minor"),
  ]);
  const bucketCount = Math.min(12, days);
  const makeBuckets = (base: Date) => Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(base.getTime() + Math.floor(index * days / bucketCount) * day);
    const last = new Date(base.getTime() + (Math.floor((index + 1) * days / bucketCount) - 1) * day);
    const label = key(date) === key(last) ? LABEL.format(date) : `${LABEL.format(date)} to ${LABEL.format(last)}`;
    return { weekStart: key(date), label, sent: 0, returned: 0, revenueMinor: 0 };
  });
  const current = makeBuckets(start);
  const earlier = makeBuckets(earlierStart);
  const add = (items: Record<string, unknown>[], column: string, field: "sent" | "returned" | "revenueMinor") => {
    for (const row of items) {
      const timestamp = new Date(row[column] as string).getTime();
      if (!Number.isFinite(timestamp)) continue;
      const localDate = new Date(`${calendarToday(new Date(timestamp), timezone)}T00:00:00Z`).getTime();
      const isCurrent = localDate >= start.getTime();
      const origin = isCurrent ? start.getTime() : earlierStart.getTime();
      const offset = Math.floor((localDate - origin) / day);
      const bucket = (isCurrent ? current : earlier)[Math.min(bucketCount - 1, Math.floor(offset * bucketCount / days))];
      if (bucket) bucket[field] += field === "revenueMinor" ? (row.value_minor as number | null) ?? 0 : 1;
    }
  };
  add(messages, "sent_at", "sent");
  add(returns, "returned_at", "returned");
  add(bookings, "created_at", "revenueMinor");
  return { weeks: current, total: sum(current), previous: sum(earlier), previousWeeks: earlier };
}

/**
 * Percentage change, or null when there is nothing to compare against.
 *
 * Null rather than 100%: going from no messages to fourteen is not a 100%
 * improvement, it is the first time casdey did anything, and dressing that up
 * as a percentage is the kind of number that makes a dashboard untrustworthy.
 */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
