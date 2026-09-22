import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardTitle } from "@/components/app/ui";
import {
  addDaysUTC,
  addMonthsUTC,
  startOfDayUTC,
  startOfMonthUTC,
  startOfQuarterUTC,
  startOfYearUTC,
  weekStartOf,
} from "@/lib/admin-period";
import type { RankedRow } from "@/lib/posthog-query";

/**
 * Presentational bits used only by /admin. The charts (LineChart, Funnel,
 * Split, MetricChart) are shared with a gym's own dashboard and live in
 * components/app/chart.tsx; these three are founder-view-only, so they sit
 * next to the page instead.
 */

/* ------------------------------------------------------------------ */
/* Period selector                                                    */
/* ------------------------------------------------------------------ */

/**
 * A reporting window: a concrete `{ from, to }` range, Stripe/Shopify-style —
 * "This month" means the calendar month to date, not a rolling 30 days.
 *
 *   - `from`/`to` drive every date-bounded query in admin-stats /
 *     posthog-query; the comparison window (always the same length,
 *     immediately before `from`) is computed on demand from the two of them
 *     via `priorWindowStart()` in src/lib/admin-period.ts, so it never has to
 *     be threaded through as a third date.
 *   - `bucket` is how the trend charts group their points: by day for short
 *     windows (≤ 35 days), by week beyond that — a daily chart of a year is
 *     365 hair-thin bars, a weekly chart of a fortnight is two.
 *   - `label` is the noun phrase ("this month", "last quarter", "45 days")
 *     for "Last …" captions; `sentence` is the full comparison line.
 *   - `param` is the URL value this period serializes to, so the nav can mark
 *     the active option without recomputing dates.
 */
export type PeriodBucket = "day" | "week";

export type AdminPeriod = {
  from: Date;
  to: Date;
  bucket: PeriodBucket;
  label: string;
  sentence: string;
  param: string;
};

/** ~2 years. Past this the "vs the period before" comparison reaches back
 *  further than casdey has existed, and the PostHog scan stops being cheap. */
export const MAX_PERIOD_DAYS = 730;

type Unit = "d" | "w" | "m";
const UNIT_DAYS: Record<Unit, number> = { d: 1, w: 7, m: 30 };
const UNIT_NAME: Record<Unit, string> = { d: "days", w: "weeks", m: "months" };
const UNIT_NAME_SINGULAR: Record<Unit, string> = { d: "day", w: "week", m: "month" };

/** The calendar-to-date presets, in display order. */
const PRESETS = [
  { param: "today", short: "Today" },
  { param: "week", short: "This week" },
  { param: "month", short: "This month" },
  { param: "quarter", short: "This quarter" },
  { param: "year", short: "This year" },
] as const;

/** The completed-prior-period options, offered under "Custom". */
const PREVIOUS = [
  { param: "prev-day", short: "Previous day" },
  { param: "prev-week", short: "Previous week" },
  { param: "prev-month", short: "Previous month" },
  { param: "prev-quarter", short: "Previous quarter" },
  { param: "prev-year", short: "Previous year" },
] as const;

/** The one the bare /admin URL means. */
const DEFAULT_PARAM = "month";

type Window = { from: Date; to: Date; label: string; sentence: string };

/** The calendar-anchored window for every non-custom preset param, or null
 *  for anything else (a custom "last N unit" period). */
function windowForParam(param: string, now: Date): Window | null {
  switch (param) {
    case "today":
      return { from: startOfDayUTC(now), to: now, label: "today", sentence: "Today so far, against yesterday." };
    case "week":
      return { from: weekStartOf(now), to: now, label: "this week", sentence: "This week so far (from Monday), against last week." };
    case "month":
      return { from: startOfMonthUTC(now), to: now, label: "this month", sentence: "This month so far, against last month." };
    case "quarter":
      return { from: startOfQuarterUTC(now), to: now, label: "this quarter", sentence: "This quarter so far, against last quarter." };
    case "year":
      return { from: startOfYearUTC(now), to: now, label: "this year", sentence: "This year so far, against last year." };
    case "prev-day": {
      const to = startOfDayUTC(now);
      return { from: addDaysUTC(to, -1), to, label: "yesterday", sentence: "Yesterday, against the day before." };
    }
    case "prev-week": {
      const to = weekStartOf(now);
      return { from: addDaysUTC(to, -7), to, label: "last week", sentence: "Last week (Monday to Sunday), against the week before." };
    }
    case "prev-month": {
      const to = startOfMonthUTC(now);
      return { from: addMonthsUTC(to, -1), to, label: "last month", sentence: "Last month, against the month before." };
    }
    case "prev-quarter": {
      const to = startOfQuarterUTC(now);
      return { from: addMonthsUTC(to, -3), to, label: "last quarter", sentence: "Last quarter, against the quarter before." };
    }
    case "prev-year": {
      const to = startOfYearUTC(now);
      return { from: addMonthsUTC(to, -12), to, label: "last year", sentence: "Last year, against the year before." };
    }
    default:
      return null;
  }
}

function finish(window: Window, param: string): AdminPeriod {
  const spanDays = Math.max(1, Math.round((window.to.getTime() - window.from.getTime()) / 86_400_000));
  return {
    from: window.from,
    to: window.to,
    bucket: spanDays <= 35 ? "day" : "week",
    label: window.label,
    sentence: window.sentence,
    param,
  };
}

/**
 * Resolve the URL into a period. Accepts, in order of precedence:
 *   - a preset key: today | week | month | quarter | year
 *   - a completed-prior-period key: prev-day | prev-week | prev-month |
 *     prev-quarter | prev-year
 *   - `r=last-<n><unit>` where unit is d/w/m — a rolling "last N" window
 *     ending now
 *   - `count=<n>` + `unit=<d|w|m>` (what the custom "last N" form submits)
 * Anything unparseable falls back to the default (this month).
 */
export function periodFrom(params: {
  r?: string;
  count?: string;
  unit?: string;
}): AdminPeriod {
  const { r, count, unit } = params;
  const now = new Date();

  const preset = r ? windowForParam(r, now) : null;
  if (preset) return finish(preset, r!);

  const combined = r?.startsWith("last-")
    ? r.slice("last-".length)
    : count
      ? `${count}${unit ?? "d"}`
      : undefined;

  if (combined) {
    const m = /^(\d{1,4})\s*(d|w|m)?$/i.exec(combined.trim());
    if (m) {
      const n = Math.min(Math.max(Number(m[1]), 1), MAX_PERIOD_DAYS);
      const u = (m[2]?.toLowerCase() as Unit | undefined) ?? "d";
      const days = Math.min(n * UNIT_DAYS[u], MAX_PERIOD_DAYS);
      const noun = n === 1 ? UNIT_NAME_SINGULAR[u] : `${n} ${UNIT_NAME[u]}`;
      return finish(
        {
          from: addDaysUTC(now, -days),
          to: now,
          label: noun,
          sentence: `The last ${noun}, against the ${noun} before.`,
        },
        `last-${n}${u}`,
      );
    }
  }

  return finish(windowForParam(DEFAULT_PARAM, now)!, DEFAULT_PARAM);
}

/** Best-fit {count, unit} for pre-filling the custom "last N" form from
 *  whatever period is currently active — only meaningful when it already is
 *  one (an active preset falls back to a plain day count, unseen while a
 *  preset is selected). */
function asCustom(period: AdminPeriod): { count: number; unit: Unit } {
  const days = Math.max(1, Math.round((period.to.getTime() - period.from.getTime()) / 86_400_000));
  if (days % 30 === 0 && days >= 30) return { count: days / 30, unit: "m" };
  if (days % 7 === 0 && days >= 7) return { count: days / 7, unit: "w" };
  return { count: days, unit: "d" };
}

/**
 * The presets and the "previous period" options are links (each period is a
 * URL, so it can be linked to and survives a reload) and the custom control is
 * a plain GET form to the same URL, so the whole thing needs no client JS and
 * the page stays one server render — Stripe/Shopify's own date-range picker,
 * minus the JS.
 */
export function PeriodNav({
  current,
  tab,
}: {
  current: AdminPeriod;
  /** The tab the period belongs to, kept when the period changes. */
  tab: string;
}) {
  const isPreset = PRESETS.some((p) => p.param === current.param);
  const previousOption = PREVIOUS.find((p) => p.param === current.param);
  const isPrevious = previousOption !== undefined;
  const isCustom = !isPreset && !isPrevious;
  const custom = asCustom(current);
  const summaryLabel = isCustom ? `Last ${current.label}` : previousOption?.short ?? "Custom";

  const linkTo = (param: string) =>
    param === DEFAULT_PARAM ? `/admin?tab=${tab}` : `/admin?tab=${tab}&r=${param}`;

  const linkClass = (active: boolean) =>
    `rounded-md border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-150 ${
      active
        ? "border-teal bg-shallow text-teal"
        : "border-ash text-graphite hover:border-stone hover:text-ink"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav aria-label="Reporting period" className="flex flex-wrap gap-1">
        {PRESETS.map((option) => (
          <Link
            key={option.param}
            href={linkTo(option.param)}
            prefetch={false}
            aria-current={option.param === current.param ? "page" : undefined}
            className={linkClass(option.param === current.param)}
          >
            {option.short}
          </Link>
        ))}
      </nav>

      <details open={!isPreset} className="relative">
        <summary
          className={`cursor-pointer list-none rounded-md border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-150 ${
            !isPreset
              ? "border-teal bg-shallow text-teal"
              : "border-ash text-graphite hover:border-stone hover:text-ink"
          }`}
        >
          {summaryLabel}
        </summary>

        <div className="absolute right-0 z-10 mt-2 w-72 space-y-3 rounded-md border border-ash bg-white p-3 shadow-lg">
          <form action="/admin" method="get" className="flex items-center gap-1.5">
            <input type="hidden" name="tab" value={tab} />
            <label htmlFor="admin-count" className="text-[0.8125rem] text-stone">
              Last
            </label>
            <input
              id="admin-count"
              name="count"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_PERIOD_DAYS}
              defaultValue={isCustom ? custom.count : undefined}
              placeholder="N"
              aria-label="Custom reporting period, a number of…"
              className="w-16 rounded-md border border-ash px-2 py-1.5 text-[0.8125rem] font-medium text-graphite"
            />
            <label htmlFor="admin-unit" className="sr-only">
              Unit
            </label>
            <select
              id="admin-unit"
              name="unit"
              defaultValue={isCustom ? custom.unit : "d"}
              className="rounded-md border border-ash bg-white px-2 py-1.5 text-[0.8125rem] font-medium text-graphite"
            >
              {(Object.keys(UNIT_NAME) as Unit[]).map((u) => (
                <option key={u} value={u}>
                  {UNIT_NAME[u]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-ash px-2.5 py-1.5 text-[0.8125rem] font-medium text-graphite transition-colors duration-150 hover:border-stone hover:text-ink"
            >
              Go
            </button>
          </form>

          <div className="border-t border-ash pt-3">
            <p className="mb-1.5 text-[0.75rem] text-stone">Or a completed period</p>
            <div className="flex flex-wrap gap-1">
              {PREVIOUS.map((option) => (
                <Link
                  key={option.param}
                  href={linkTo(option.param)}
                  prefetch={false}
                  aria-current={option.param === current.param ? "page" : undefined}
                  className={linkClass(option.param === current.param)}
                >
                  {option.short}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                    */
/* ------------------------------------------------------------------ */

export function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 border-t border-ash pt-8 first:mt-0 first:border-0 first:pt-0">
      <div className="mb-4">
        <h2 className="display text-[1.25rem]">{title}</h2>
        {sub ? <p className="text-[0.875rem] text-stone">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ranked list (top pages / referrers / countries / …)                */
/* ------------------------------------------------------------------ */

export function RankedList({
  title,
  rows,
  empty,
  unit,
}: {
  title: string;
  /** null means the data source (PostHog) is not connected or failed. */
  rows: RankedRow[] | null;
  empty: string;
  unit?: string;
}) {
  const max = rows && rows.length > 0 ? Math.max(...rows.map((r) => r.value)) : 1;

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {rows === null ? (
        <p className="mt-2 text-[0.8125rem] text-stone">
          PostHog not connected.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-[0.8125rem] text-stone">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3 text-[0.875rem]">
                <span className="min-w-0 truncate text-graphite" title={row.label}>
                  {row.label}
                </span>
                <span className="literal shrink-0 font-medium text-ink">
                  {row.value.toLocaleString("en-GB")}
                  {unit ? (
                    <span className="text-stone">
                      {" "}
                      {row.value === 1 ? unit.replace(/s$/, "") : unit}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-mist">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((row.value / max) * 100, 2)}%`,
                    background: "var(--teal)",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
