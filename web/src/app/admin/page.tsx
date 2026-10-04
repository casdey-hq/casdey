import type { Metadata } from "next";
import { Mark } from "@/components/mark";
import { requireAdmin } from "@/lib/admin";
import { RANGES, bucketOf, bucketsFor, countBy, inWindow, loadSignups, loadVisitors, parseRange, windowFor, type Visitors } from "@/lib/stats";
import { dayPoint, hourPoint } from "@/lib/chart-points";
import { BarChart } from "./bar-chart";
import { PeriodBody, PeriodProvider, PeriodTabs } from "./period";

export const metadata: Metadata = { title: "Admin · Casdey", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const GOALS: Record<string, string> = { body: "Body", face: "Face and skin", style: "Style", discipline: "Discipline", none: "Didn't pick" };
const regions = new Intl.DisplayNames(["en"], { type: "region" });
const country = (code: string) => {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try { return regions.of(code) ?? code; } catch { return code; }
};
const PLATFORMS: Record<string, string> = { tiktok: "TikTok (/tt)", instagram: "Instagram (/ig)", youtube: "YouTube (/yt)" };
const platform = (label: string) => PLATFORMS[label] ?? label;
const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : "0%");

function Delta({ now, before, than, none }: { now: number; before: number | null; than: string; none: string }) {
  if (before === null) return <span className="kpi-note">{none}</span>;
  const diff = now - before;
  const text = diff === 0 ? `Same as ${than}` : `${diff > 0 ? "+" : ""}${diff} vs ${than}`;
  return <span className="kpi-note">{text}</span>;
}

function Breakdown({ title, rows, total, empty }: { title: string; rows: { label: string; value: number }[]; total: number; empty: string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <table className="breakdown">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">
                  <span>{row.label}</span>
                  <i style={{ width: percent(row.value, rows[0].value) }} aria-hidden="true" />
                </th>
                <td>{row.value}</td>
                <td className="share">{percent(row.value, total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default async function Admin({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const email = await requireAdmin();
  const range = parseRange((await searchParams).range);
  const period = windowFor(range);
  const isToday = range === "today";

  // Supabase and PostHog are fetched side by side, not one after the other.
  const [allSignups, visitors] = await Promise.all([
    loadSignups(),
    loadVisitors(period).catch((error): Visitors | null => {
      console.error("admin: PostHog failed", error);
      return null;
    }),
  ]);
  const signups = inWindow(allSignups, period.from, period.to);
  const previousSignups = period.previous ? inWindow(allSignups, period.previous.from, period.previous.to).length : null;

  const buckets = bucketsFor(period);
  const signupSeries = new Map(countBy(signups, (signup) => bucketOf(period, new Date(signup.created_at))).map((row) => [row.label, row.value]));
  const point = (bucket: string, value: number) => (isToday ? hourPoint(Number(bucket), value) : dayPoint(bucket, value));
  const per = isToday ? "hour" : "day";
  const compareWith = isToday ? "yesterday by now" : "the period before";
  const noEarlier = isToday ? "No full yesterday to compare yet" : "No earlier period yet";

  return (
    <PeriodProvider>
    <div className="admin">
      <header className="admin-bar">
        <div className="admin-brand"><Mark /><span>Casdey</span><em>Admin</em></div>
        <PeriodTabs options={RANGES} current={range} />
        <form action="/admin/signout" method="post" className="who">
          <span>{email}</span>
          <button type="submit">Sign out</button>
        </form>
      </header>

      <PeriodBody>
      <main className="admin-main">
        <section className="kpis" aria-label="Summary">
          <div className="kpi">
            <span className="kpi-label">Visitors</span>
            <b>{visitors ? visitors.total : "–"}</b>
            {visitors ? <Delta now={visitors.total} before={visitors.previousTotal} than={compareWith} none={noEarlier} /> : <span className="kpi-note">PostHog didn&rsquo;t answer</span>}
          </div>
          <div className="kpi">
            <span className="kpi-label">Signups</span>
            <b>{signups.length}</b>
            <Delta now={signups.length} before={previousSignups} than={compareWith} none={noEarlier} />
          </div>
          <div className="kpi">
            <span className="kpi-label">Conversion</span>
            <b>{visitors ? percent(signups.length, visitors.total) : "–"}</b>
            <span className="kpi-note">Signups per visitor</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">On the list</span>
            <b>{allSignups.length}</b>
            <span className="kpi-note">Everyone who has joined</span>
          </div>
        </section>

        <section className="charts">
          <div className="panel">
            <h2>Visitors per {per}</h2>
            {visitors ? (
              <BarChart points={buckets.map((bucket) => point(bucket, visitors.series.get(bucket) ?? 0))} unit={["visitor", "visitors"]} />
            ) : (
              <p className="empty">Visitor data is unavailable right now.</p>
            )}
          </div>
          <div className="panel">
            <h2>Signups per {per}</h2>
            <BarChart points={buckets.map((bucket) => point(bucket, signupSeries.get(bucket) ?? 0))} unit={["signup", "signups"]} />
          </div>
        </section>

        <section className="breakdowns">
          <Breakdown
            title="What they want to improve"
            rows={countBy(signups, (signup) => GOALS[signup.goal ?? "none"] ?? signup.goal ?? "Didn't pick")}
            total={signups.length}
            empty="No signups in this period yet."
          />
          <Breakdown
            title="Where visitors come from"
            rows={visitors?.referrers ?? []}
            total={visitors?.total ?? 0}
            empty="No visits in this period yet."
          />
          <Breakdown
            title="Visitors by bio link"
            rows={(visitors?.platforms ?? []).map((row) => ({ ...row, label: platform(row.label) }))}
            total={visitors?.total ?? 0}
            empty="No visits in this period yet."
          />
          <Breakdown
            title="Signups by bio link"
            rows={(visitors?.platformSignups ?? []).map((row) => ({ ...row, label: platform(row.label) }))}
            total={(visitors?.platformSignups ?? []).reduce((sum, row) => sum + row.value, 0)}
            empty="No signups in this period yet."
          />
          <Breakdown
            title="Visitor countries"
            rows={(visitors?.countries ?? []).map((row) => ({ ...row, label: country(row.label) }))}
            total={visitors?.total ?? 0}
            empty="No visits in this period yet."
          />
          <Breakdown
            title="Signup countries"
            rows={countBy(signups, (signup) => (signup.country ? country(signup.country) : "Unknown"))}
            total={signups.length}
            empty="No signups in this period yet."
          />
          <Breakdown
            title="Devices"
            rows={(visitors?.devices ?? []).map((row) => ({ ...row, label: row.label.charAt(0).toUpperCase() + row.label.slice(1) }))}
            total={visitors?.total ?? 0}
            empty="No visits in this period yet."
          />
          <Breakdown
            title="Which form they used"
            rows={countBy(signups, (signup) => (signup.source === "closing" ? "Bottom of the page" : signup.source === "hero" ? "Top of the page" : signup.source ?? "Unknown"))}
            total={signups.length}
            empty="No signups in this period yet."
          />
        </section>

        <section className="panel">
          <h2>Latest signups</h2>
          {allSignups.length === 0 ? (
            <p className="empty">Nobody has joined yet. Share www.casdey.com and the first ones land here.</p>
          ) : (
            <div className="table-scroll">
              <table className="latest">
                <thead><tr><th>Email</th><th>Wants to improve</th><th>Country</th><th>Joined</th></tr></thead>
                <tbody>
                  {allSignups.slice(0, 25).map((signup) => (
                    <tr key={signup.email}>
                      <td>{signup.email}</td>
                      <td>{GOALS[signup.goal ?? "none"]}</td>
                      <td>{signup.country ? country(signup.country) : "Unknown"}</td>
                      <td>{new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(signup.created_at))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <p className="admin-foot">Visitors are counted without cookies, so one person on two days counts twice. Days run on Italian time.</p>
      </main>
      </PeriodBody>
    </div>
    </PeriodProvider>
  );
}
