// Numbers for /admin. Signups come from the Supabase waitlist table, visitors
// from PostHog (cookieless). Days are counted in Davide's time zone.

export const TIME_ZONE = "Europe/Rome";
/** The waitlist went live 2026-09-26; PostHog holds part 1 events before it. */
export const LAUNCH = new Date("2026-09-26T19:00:00Z");
const HOSTS = ["www.casdey.com", "casdey.com"];

export type Range = "7d" | "30d" | "all";
export const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "Since launch" },
];

export function parseRange(value: string | undefined): Range {
  return value === "30d" || value === "all" ? value : "7d";
}

export type Window = { from: Date; to: Date; previousFrom: Date | null };

export function windowFor(range: Range, now = new Date()): Window {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : null;
  if (!days) return { from: LAUNCH, to: now, previousFrom: null };
  const wanted = new Date(now.getTime() - days * 86_400_000);
  const from = wanted < LAUNCH ? LAUNCH : wanted;
  const previousFrom = new Date(from.getTime() - (now.getTime() - from.getTime()));
  return { from, to: now, previousFrom: previousFrom >= LAUNCH ? previousFrom : null };
}

/** YYYY-MM-DD of a date in Davide's time zone. */
export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
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

// ---------- signups ----------

export type Signup = { email: string; goal: string | null; country: string | null; source: string | null; created_at: string };

export async function loadSignups(): Promise<Signup[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  const response = await fetch(`${url}/rest/v1/waitlist?select=email,goal,country,source,created_at&order=created_at.desc&limit=10000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase answered ${response.status}`);
  return (await response.json()) as Signup[];
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

function pageviews(from: Date, to: Date): string {
  const hosts = HOSTS.map((host) => `'${host}'`).join(", ");
  return `event = '$pageview' AND timestamp >= toDateTime('${utc(from)}') AND timestamp <= toDateTime('${utc(to)}') AND properties.$host IN (${hosts})`;
}

export type Visitors = {
  total: number;
  pageviews: number;
  previousTotal: number | null;
  daily: Map<string, number>;
  referrers: { label: string; value: number }[];
  countries: { label: string; value: number }[];
  devices: { label: string; value: number }[];
};

export async function loadVisitors(window: Window): Promise<Visitors> {
  const where = pageviews(window.from, window.to);
  const breakdown = (property: string) =>
    hogql<[string | null, number]>(
      `SELECT ${property} AS k, count(DISTINCT distinct_id) AS v FROM events WHERE ${where} GROUP BY k ORDER BY v DESC LIMIT 8`,
    );
  const [totals, daily, previous, referrers, countries, devices] = await Promise.all([
    hogql<[number, number]>(`SELECT count(DISTINCT distinct_id), count() FROM events WHERE ${where}`),
    hogql<[string, number]>(
      `SELECT toString(toDate(toTimeZone(timestamp, '${TIME_ZONE}'))) AS d, count(DISTINCT distinct_id) FROM events WHERE ${where} GROUP BY d ORDER BY d`,
    ),
    window.previousFrom
      ? hogql<[number]>(`SELECT count(DISTINCT distinct_id) FROM events WHERE ${pageviews(window.previousFrom, window.from)}`)
      : Promise.resolve(null),
    breakdown("properties.$referring_domain"),
    breakdown("properties.visitor_country"),
    breakdown("properties.$device_type"),
  ]);
  const rows = (list: [string | null, number][], blank: string) =>
    list.map(([label, value]) => ({ label: label && label !== "$direct" ? label : blank, value }));
  return {
    total: totals[0]?.[0] ?? 0,
    pageviews: totals[0]?.[1] ?? 0,
    previousTotal: previous ? previous[0]?.[0] ?? 0 : null,
    daily: new Map(daily.map(([day, value]) => [day, value])),
    referrers: rows(referrers, "Direct or unknown"),
    countries: rows(countries, "Unknown"),
    devices: rows(devices, "Unknown"),
  };
}
