// Numbers for /admin. Signups come from the Supabase waitlist table, visitors
// from PostHog (cookieless). Days and hours are counted in Davide's time zone.

export const TIME_ZONE = "Europe/Rome";
/** The waitlist went live 2026-09-26; PostHog holds part 1 events before it. */
export const LAUNCH = new Date("2026-09-26T19:00:00Z");
const HOSTS = ["www.casdey.com", "casdey.com"];

export type Range = "today" | "7d" | "30d" | "all";
export const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "Since launch" },
];

export function parseRange(value: string | undefined): Range {
  return value === "today" || value === "30d" || value === "all" ? value : "7d";
}

// ---------- time ----------

/** YYYY-MM-DD of a date in Davide's time zone. */
export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Hour of the day (0-23) of an instant in Davide's time zone. */
export function hourOf(at: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(at));
}

/** Minutes the time zone is ahead of UTC at a given instant. */
function offsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((local - at.getTime()) / 60_000);
}

/** The instant a YYYY-MM-DD day starts in Davide's time zone. */
function startOfDay(key: string): Date {
  const guess = new Date(`${key}T00:00:00Z`);
  return new Date(guess.getTime() - offsetMinutes(guess) * 60_000);
}

/** Every day from `from` to `to`, inclusive, as YYYY-MM-DD keys. */
export function daysBetween(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const last = dayKey(to);
  for (let t = from.getTime(); ; t += 86_400_000) {
    const key = dayKey(new Date(t));
    if (keys[keys.length - 1] !== key) keys.push(key);
    if (key >= last) break;
  }
  return keys;
}

/**
 * The period on screen and the one it is compared with. Today is compared with
 * yesterday up to the same time; 7 and 30 days with the same length just
 * before. Nothing before the launch counts, so a comparison that would reach
 * back past it is left out.
 */
export type Window = { range: Range; from: Date; to: Date; previous: { from: Date; to: Date } | null };

export function windowFor(range: Range, now = new Date()): Window {
  if (range === "all") return { range, from: LAUNCH, to: now, previous: null };
  if (range === "today") {
    const dayStart = startOfDay(dayKey(now));
    const yesterdayFrom = startOfDay(dayKey(new Date(dayStart.getTime() - 12 * 3_600_000)));
    const previous = { from: yesterdayFrom, to: new Date(yesterdayFrom.getTime() + (now.getTime() - dayStart.getTime())) };
    return { range, from: dayStart < LAUNCH ? LAUNCH : dayStart, to: now, previous: yesterdayFrom >= LAUNCH ? previous : null };
  }
  const days = range === "7d" ? 7 : 30;
  const wanted = new Date(now.getTime() - days * 86_400_000);
  const from = wanted < LAUNCH ? LAUNCH : wanted;
  const previousFrom = new Date(from.getTime() - (now.getTime() - from.getTime()));
  return { range, from, to: now, previous: previousFrom >= LAUNCH ? { from: previousFrom, to: from } : null };
}

/** Chart buckets: hours of the day for Today, days otherwise. */
export function bucketsFor(window: Window): string[] {
  return window.range === "today" ? Array.from({ length: 24 }, (_, hour) => String(hour)) : daysBetween(window.from, window.to);
}

export function bucketOf(window: Window, at: Date): string {
  return window.range === "today" ? String(hourOf(at)) : dayKey(at);
}

// ---------- signups ----------

export type Signup = { email: string; goal: string | null; country: string | null; source: string | null; created_at: string };

/**
 * Every lead: waitlist signups (until 2026-10-05) and completed free analyses
 * (from then on). A repeat analysis by the same email counts once, at its first.
 */
export async function loadSignups(): Promise<Signup[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  const load = async (table: string) => {
    const response = await fetch(`${url}/rest/v1/${table}?select=email,goal,country,source,created_at&order=created_at.asc&limit=10000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Supabase answered ${response.status} for ${table}`);
    return (await response.json()) as Signup[];
  };
  const [waitlist, analyses] = await Promise.all([load("waitlist"), load("analyses")]);
  const first = new Map<string, Signup>();
  for (const signup of [...waitlist, ...analyses]) {
    const seen = first.get(signup.email);
    if (!seen || signup.created_at < seen.created_at) first.set(signup.email, signup);
  }
  return [...first.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function inWindow(signups: Signup[], from: Date, to: Date): Signup[] {
  return signups.filter((signup) => {
    const at = new Date(signup.created_at);
    return at >= from && at <= to;
  });
}

export function countBy<T>(items: T[], pick: (item: T) => string): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(pick(item), (counts.get(pick(item)) ?? 0) + 1);
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

// ---------- visitors (PostHog) ----------

async function hogql<T extends unknown[]>(query: string): Promise<T[]> {
  const project = process.env.POSTHOG_PROJECT_ID;
  const token = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!project || !token) throw new Error("PostHog is not configured");
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com").replace(".i.posthog.com", ".posthog.com");
  const response = await fetch(`${host}/api/projects/${project}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`PostHog answered ${response.status}`);
  const body = (await response.json()) as { results: T[] };
  return body.results;
}

function utc(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function pageviews(from: Date, to: Date, events = ["$pageview"]): string {
  const hosts = HOSTS.map((host) => `'${host}'`).join(", ");
  return `event IN (${events.map((event) => `'${event}'`).join(", ")}) AND timestamp >= toDateTime('${utc(from)}') AND timestamp <= toDateTime('${utc(to)}') AND properties.$host IN (${hosts})`;
}

export type Visitors = {
  total: number;
  previousTotal: number | null;
  /** Visitors per chart bucket (hour for Today, day otherwise). */
  series: Map<string, number>;
  referrers: { label: string; value: number }[];
  countries: { label: string; value: number }[];
  devices: { label: string; value: number }[];
  /** Visitors and signups by bio link (utm_source from /tt, /ig, /yt). */
  platforms: { label: string; value: number }[];
  platformSignups: { label: string; value: number }[];
};

export async function loadVisitors(window: Window): Promise<Visitors> {
  const where = pageviews(window.from, window.to);
  const bucket = window.range === "today"
    ? `toString(toHour(toTimeZone(timestamp, '${TIME_ZONE}')))`
    : `toString(toDate(toTimeZone(timestamp, '${TIME_ZONE}')))`;
  const breakdown = (property: string) =>
    hogql<[string | null, number]>(
      `SELECT ${property} AS k, count(DISTINCT distinct_id) AS v FROM events WHERE ${where} GROUP BY k ORDER BY v DESC LIMIT 8`,
    );
  const [totals, series, previous, referrers, countries, devices, platforms, platformSignups] = await Promise.all([
    hogql<[number]>(`SELECT count(DISTINCT distinct_id) FROM events WHERE ${where}`),
    hogql<[string, number]>(`SELECT ${bucket} AS b, count(DISTINCT distinct_id) FROM events WHERE ${where} GROUP BY b`),
    window.previous
      ? hogql<[number]>(`SELECT count(DISTINCT distinct_id) FROM events WHERE ${pageviews(window.previous.from, window.previous.to)}`)
      : Promise.resolve(null),
    breakdown("properties.$referring_domain"),
    breakdown("properties.visitor_country"),
    breakdown("properties.$device_type"),
    breakdown("properties.utm_source"),
    hogql<[string | null, number]>(
      `SELECT properties.utm_source AS k, count() AS v FROM events WHERE ${pageviews(window.from, window.to, ["waitlist_joined", "analysis_done"])} GROUP BY k ORDER BY v DESC LIMIT 8`,
    ),
  ]);
  const rows = (list: [string | null, number][], blank: string) =>
    list.map(([label, value]) => ({
      label: !label || label === "$direct" ? blank : HOSTS.includes(label) ? "Within the site" : label,
      value,
    }));
  return {
    total: totals[0]?.[0] ?? 0,
    previousTotal: previous ? previous[0]?.[0] ?? 0 : null,
    series: new Map(series.map(([key, value]) => [key, value])),
    referrers: rows(referrers, "Direct or unknown"),
    countries: rows(countries, "Unknown"),
    devices: rows(devices, "Unknown"),
    platforms: rows(platforms, "No bio link"),
    platformSignups: rows(platformSignups, "No bio link"),
  };
}
