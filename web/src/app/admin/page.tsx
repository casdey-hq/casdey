import Link from "next/link";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/app/ui";
import { PeriodNav, Section, periodFrom } from "./parts";
import { NumbersTab } from "./numbers-tab";
import { TodayTab } from "./today-tab";
import { MarketingTab } from "./marketing-tab";
import { BusinessTab } from "./business-tab";
import { CheckupTab } from "./checkup-tab";
import { SupportTab } from "./support-tab";

export const metadata = { title: "casdey HQ" };

/**
 * casdey HQ: the one place for how the business is doing (IMPROVEMENTS.md #2
 * and #4, 2026-09-19).
 *
 * It replaced four sources that each went stale on their own clock: this page
 * (live, numbers only), the casdey HQ and Marketing Plan Google Docs (pushed
 * by hand) and the weekly check-up artifact. Everything here is either
 * computed live, or written into casdey's own tables (migration 0041) by
 * Davide on this page or by Claude with scripts/hq.mjs, and shown the moment
 * it is saved. Nothing needs pushing.
 *
 *   Overview   to-dos (live signals, the check-up's proposals, anything added
 *              by hand), goals with live progress, and who does what
 *   Numbers    money, signups, activation, traffic, product output
 *   Marketing  outreach, the weekly test review, Instagram, the plan
 *   Business   the offer, prices, costs, per-gym economics, break-even
 *   Check-up   each Sunday's analysis, its proposals, and earlier weeks
 *
 * Each tab streams in on its own, so a slow Google or PostHog read holds only
 * the tab that needs it.
 */

const TABS = [
  { id: "today", label: "Overview" },
  { id: "numbers", label: "Numbers" },
  { id: "marketing", label: "Marketing" },
  { id: "business", label: "Business" },
  { id: "checkup", label: "Check-up" },
  { id: "support", label: "Support" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function AdminPage(props: PageProps<"/admin">) {
  await requireAdmin();

  const sp = await props.searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const requested = one(sp.tab);
  const tab: TabId = TABS.some((t) => t.id === requested)
    ? (requested as TabId)
    : "today";
  const period = periodFrom({
    r: one(sp.r),
    count: one(sp.count),
    unit: one(sp.unit),
  });
  const periodMatters = tab === "numbers" || tab === "marketing";

  return (
    <>
      <PageHeader
        eyebrow="casdey HQ"
        title="How casdey is doing"
        lede="Live, all of it. Numbers are read straight from Stripe, casdey's own tables, PostHog and the leads sheet; everything written (the plan, goals, to-dos, costs) is saved here and shows the moment it changes."
        actions={periodMatters ? <PeriodNav current={period} tab={tab} /> : undefined}
      />

      <nav
        aria-label="Sections"
        className="mb-8 flex gap-1 overflow-x-auto overflow-y-hidden overscroll-y-none border-b border-ash"
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              href={`/admin?tab=${t.id}`}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[0.9375rem] font-medium transition-colors duration-150 ${
                active
                  ? "border-teal text-ink"
                  : "border-transparent text-stone hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <Suspense
        key={tab}
        fallback={
          <Section title="Loading" sub="Reading the live sources…">
            <div className="h-40" />
          </Section>
        }
      >
        {tab === "today" ? <TodayTab /> : null}
        {tab === "numbers" ? <NumbersTab period={period} /> : null}
        {tab === "marketing" ? <MarketingTab period={period} /> : null}
        {tab === "business" ? <BusinessTab /> : null}
        {tab === "checkup" ? <CheckupTab /> : null}
        {tab === "support" ? <SupportTab /> : null}
      </Suspense>
    </>
  );
}
