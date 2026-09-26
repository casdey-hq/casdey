import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/components/mark";
import { requireAdmin } from "@/lib/admin";
import {
  LAUNCH, RANGES, countBy, dayKey, daysBetween, hourOf, inWindow, loadSignups, loadTodayVisitors, loadVisitors, parseRange, todayWindow, windowFor,
  type Today, type Visitors,
} from "@/lib/stats";
import { dayPoint, hourPoint } from "@/lib/chart-points";
import { BarChart } from "./bar-chart";

export const metadata: Metadata = { title: "Admin · Casdey", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const GOALS: Record<string, string> = { body: "Body", face: "Face and skin", style: "Style", discipline: "Discipline", none: "Didn't pick" };
const regions = new Intl.DisplayNames(["en"], { type: "region" });
const country = (code: string) => {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try { return regions.of(code) ?? code; } catch { return code; }
};
const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : "0%");

function Delta({ now, before }: { now: number; before: number | null }) {
  if (before === null) return <span className="kpi-note">No earlier period yet</span>;
  const diff = now - before;
  const text = diff === 0 ? "Same as the period before" : `${diff > 0 ? "+" : ""}${diff} vs the period before`;
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

  const allSignups = await loadSignups();
  const signups = inWindow(allSignups, period.from, period.to);
  const previousSignups = period.previousFrom ? inWindow(allSignups, period.previousFrom, period.from).length : null;
  const now = new Date();
  const todaySpan = todayWindow(now);
  const signupsToday = inWindow(allSignups, todaySpan.from, now);
  const signupsYesterday = inWindow(allSignups, todaySpan.yesterdayFrom, todaySpan.yesterdayTo).length;
  const signupsByHour = new Map(countBy(signupsToday, (signup) => String(hourOf(new Date(signup.created_at)))).map((row) => [Number(row.label), row.value]));
  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  let visitors: Visitors | null = null;
  let today: Today | null = null;
  try {
    [visitors, today] = await Promise.all([loadVisitors(period), loadTodayVisitors(now)]);
  } catch (error) {
    console.error("admin: PostHog failed", error);
  }

  const days = daysBetween(period.from, period.to);
  const hadYesterday = todaySpan.yesterdayFrom >= LAUNCH;
  const vsYesterday = (value: number, before: number | null) =>
    before === null || !hadYesterday ? "No full yesterday to compare yet" : value === before ? "Same as yesterday by now" : `${value > before ? "+" : ""}${value - before} vs yesterday by now`;
  const signupsByDay = new Map(countBy(signups, (signup) => dayKey(new Date(signup.created_at))).map((row) => [row.label, row.value]));

  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="admin-brand"><Mark /><span>Casdey</span><em>Admin</em></div>
        <nav className="ranges" aria-label="Period">
          {RANGES.map((option) => (
            <Link key={option.value} href={`/admin?range=${option.value}`} prefetch={false} aria-current={option.value === range ? "page" : undefined}>
              {option.label}
            </Link>
          ))}
        </nav>
        <form action="/admin/signout" method="post" className="who">
          <span>{email}</span>
          <button type="submit">Sign out</button>
        </form>
      </header>

      <main className="admin-main">
        <section className="today" aria-labelledby="today-title">
          <div className="today-head">
            <h2 id="today-title">Today</h2>
            <span>{new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(now)}</span>
          </div>
          <div className="today-kpis">
            <div className="kpi">
              <span className="kpi-label">Visitors</span>
              <b>{today ? today.visitors : "–"}</b>
              <span className="kpi-note">{today ? vsYesterday(today.visitors, today.visitorsYesterday) : "PostHog didn’t answer"}</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">Signups</span>
              <b>{signupsToday.length}</b>
              <span className="kpi-note">{vsYesterday(signupsToday.length, signupsYesterday)}</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">Conversion</span>
              <b>{today ? percent(signupsToday.length, today.visitors) : "–"}</b>
              <span className="kpi-note">Signups per visitor today</span>
            </div>
          </div>
          <div className="charts">
            <div className="panel">
              <h2>Visitors per hour</h2>
              {today ? (
                <BarChart points={hours.map((hour) => hourPoint(hour, today.hourly.get(hour) ?? 0))} unit={["visitor", "visitors"]} />
              ) : (
                <p className="empty">Visitor data is unavailable right now.</p>
              )}
            </div>
            <div className="panel">
              <h2>Signups per hour</h2>
              <BarChart points={hours.map((hour) => hourPoint(hour, signupsByHour.get(hour) ?? 0))} unit={["signup", "signups"]} />
            </div>
          </div>
        </section>

        <div className="period-head"><h2>{RANGES.find((option) => option.value === range)?.label}</h2></div>
        <section className="kpis" aria-label="Summary">
          <div className="kpi">
            <span className="kpi-label">Visitors</span>
            <b>{visitors ? visitors.total : "–"}</b>
            {visitors ? <Delta now={visitors.total} before={visitors.previousTotal} /> : <span className="kpi-note">PostHog didn&rsquo;t answer</span>}
          </div>
          <div className="kpi">
            <span className="kpi-label">Signups</span>
            <b>{signups.length}</b>
            <Delta now={signups.length} before={previousSignups} />
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
            <h2>Visitors per day</h2>
            {visitors ? (
              <BarChart points={days.map((day) => dayPoint(day, visitors.daily.get(day) ?? 0))} unit={["visitor", "visitors"]} />
            ) : (
              <p className="empty">Visitor data is unavailable right now.</p>
            )}
          </div>
          <div className="panel">
            <h2>Signups per day</h2>
            <BarChart points={days.map((day) => dayPoint(day, signupsByDay.get(day) ?? 0))} unit={["signup", "signups"]} />
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
    </div>
  );
}
