import { Suspense } from "react";

import { Card, CardTitle, Stat } from "@/components/app/ui";
import { readHq } from "@/lib/hq";
import { marketingSummary } from "@/lib/marketing-stats";
import { MIN_REPLIES_TO_CALL, type RunningTest } from "@/lib/marketing-summary";
import { NoteEditor } from "./hq-client";
import { MarkdownLite } from "./markdown-lite";
import { OutreachSection } from "./outreach-section";
import { Section, type AdminPeriod } from "./parts";

/**
 * Marketing: cold outreach, the weekly test review, Instagram, and the plan.
 *
 * The test review is the same calculation the Sunday check-up makes
 * (src/lib/marketing-summary.ts), live. It proposes; the call is Davide's, in
 * the Sunday review, and only then is the Test Log row written.
 */

const LEADS_SHEET =
  "https://docs.google.com/spreadsheets/d/1WOAIA1gvK6S1kWe_Vf4-d4XmjhnDLQZLtyU_ezvOu3w/edit";

export async function MarketingTab({ period }: { period: AdminPeriod }) {
  const [marketing, hq] = await Promise.all([marketingSummary(), readHq()]);
  const plan = hq.notes.marketing_plan;

  return (
    <>
      <p className="mb-6 text-[0.875rem] text-stone">
        Everything below reads the{" "}
        <a href={LEADS_SHEET} target="_blank" rel="noopener noreferrer" className="text-teal hover:text-teal-hover">
          leads sheet
        </a>{" "}
        live.
      </p>

      <Suspense fallback={<Section title="Outreach" sub="Reading the leads sheet…"><div className="h-28" /></Section>}>
        <OutreachSection period={period} />
      </Suspense>

      {marketing === null ? (
        <Section title="Tests and Instagram">
          <Card>
            <CardTitle>Leads sheet did not answer</CardTitle>
            <p className="mt-2 text-[0.8125rem] text-stone">
              Reload in a minute. If it keeps failing, check GOOGLE_SERVICE_ACCOUNT_JSON in Vercel.
            </p>
          </Card>
        </Section>
      ) : (
        <>
          <Section
            title="This week's cohort"
            sub="Gyms first contacted in the last seven days. The weekly goal is measured on these, not all time."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label="First contacted" value={marketing.weekCohort.contacted} />
              <Stat
                label="Replied"
                value={marketing.weekCohort.replied}
                hint={marketing.weekCohort.replyRatePct === null ? undefined : `${marketing.weekCohort.replyRatePct}%, target 3%`}
              />
              <Stat
                label="Engaged"
                value={marketing.weekCohort.engaged}
                hint={marketing.weekCohort.engagedRatePct === null ? undefined : `${marketing.weekCohort.engagedRatePct}%`}
                tone="teal"
              />
            </div>
            {marketing.engagedLeads.length > 0 ? (
              <p className="mt-4 text-[0.875rem] text-graphite">
                Engaged, all time:{" "}
                {marketing.engagedLeads.map((lead) => lead.gym || `#${lead.lead}`).join(", ")}.
              </p>
            ) : null}
          </Section>

          <Section
            title="Weekly test review"
            sub={`A test is only called with ${MIN_REPLIES_TO_CALL}+ replies across its arms. The verdict here is a proposal; the Sunday review decides.`}
          >
            {marketing.runningTests.length === 0 ? (
              <p className="text-[0.875rem] text-stone">No test running. Pick the next one in the Sunday review.</p>
            ) : (
              <div className="space-y-4">
                {marketing.runningTests.map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
              </div>
            )}

            {marketing.closedTests.length > 0 ? (
              <details className="mt-5">
                <summary className="cursor-pointer text-[0.875rem] font-semibold text-teal">
                  Earlier tests ({marketing.closedTests.length})
                </summary>
                <ul className="mt-3 space-y-3">
                  {marketing.closedTests.map((test) => (
                    <li key={test.id} className="text-[0.875rem] leading-relaxed text-graphite">
                      <span className="font-semibold text-ink">{test.id}</span> · {test.asset}, {test.component}.{" "}
                      Winner: {test.winner || "none"}.{test.decision ? ` ${test.decision}` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </Section>

          <Section title="Instagram" sub="Cold DMs are sent by hand; posts go out automatically once approved.">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat
                label="DMs sent, 7 days"
                value={marketing.igOutreach?.sentThisWeek ?? "—"}
                hint={marketing.igOutreach ? `${marketing.igOutreach.unsentDrafts} drafts waiting` : undefined}
              />
              <Stat
                label="Posts out"
                value={marketing.igContent?.postedTotal ?? "—"}
                hint={
                  marketing.igContent
                    ? marketing.igContent.behindBy > 0
                      ? `${marketing.igContent.behindBy} behind the one-a-day plan`
                      : `Day ${marketing.igContent.day ?? 0} of 100, on schedule`
                    : undefined
                }
              />
              <Stat
                label="Followers"
                value={marketing.igWeekly?.followers ?? "—"}
                hint={
                  marketing.igWeekly
                    ? `Week ending ${marketing.igWeekly.weekEnding}${marketing.igWeekly.followerGrowthPct !== null ? `, ${marketing.igWeekly.followerGrowthPct > 0 ? "+" : ""}${marketing.igWeekly.followerGrowthPct}%` : ""}`
                    : undefined
                }
              />
              <Stat
                label="Asked for the video"
                value={marketing.inboundDms?.total ?? "—"}
                hint={
                  marketing.inboundDms
                    ? `${marketing.inboundDms.engagedTotal} engaged · ${marketing.inboundDms.videoNotSentYet.length} waiting for it`
                    : undefined
                }
              />
            </div>
            {marketing.igContent && marketing.igContent.feedbackOpen.length > 0 ? (
              <Card className="mt-4">
                <CardTitle>Your feedback waiting on Claude</CardTitle>
                <ul className="mt-2 space-y-1.5 text-[0.875rem] text-graphite">
                  {marketing.igContent.feedbackOpen.map((item) => (
                    <li key={item.post}>
                      <span className="font-semibold text-ink">{item.post}</span>: {item.feedback}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </Section>
        </>
      )}

      {plan ? (
        <Section
          title={plan.title}
          sub={`Last edited ${new Date(plan.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })} by ${plan.updated_by === "davide" ? "you" : "Claude"}.`}
        >
          <Card>
            <NoteEditor noteKey={plan.key} body={plan.body}>
              <MarkdownLite source={plan.body} />
            </NoteEditor>
          </Card>
        </Section>
      ) : null}
    </>
  );
}

function TestCard({ test }: { test: RunningTest }) {
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle>
          {test.id} · {test.asset}, {test.component}
        </CardTitle>
        <p className="label text-stone">
          Day {test.daysRunning ?? "?"}
          {test.reviewDueOn ? ` · review due ${test.reviewDueOn}` : ""}
          {test.reviewOverdueDays ? ` · ${test.reviewOverdueDays} days overdue` : ""}
        </p>
      </div>
      {test.hypothesis ? (
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-stone">{test.hypothesis}</p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[26rem] text-left text-[0.875rem]">
          <thead>
            <tr className="label text-stone">
              <th className="py-1.5 pr-3 font-medium">Arm</th>
              <th className="py-1.5 pr-3 font-medium">Sent</th>
              <th className="py-1.5 pr-3 font-medium">Replies</th>
              <th className="py-1.5 pr-3 font-medium">Reply rate</th>
              <th className="py-1.5 font-medium">Engaged</th>
            </tr>
          </thead>
          <tbody className="literal">
            {test.arms.map((arm) => (
              <tr key={arm.key} className="border-t border-ash">
                <td className="py-2 pr-3 font-semibold text-ink">{arm.key}</td>
                <td className="py-2 pr-3">{arm.sends}</td>
                <td className="py-2 pr-3">{arm.replies}</td>
                <td className="py-2 pr-3">{arm.replyRatePct === null ? "—" : `${arm.replyRatePct}%`}</td>
                <td className="py-2">{arm.engaged}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[0.9375rem] text-ink">
        <span className="font-semibold">Proposed verdict:</span> {test.verdict}.
      </p>
      <ul className="mt-2 space-y-0.5 text-[0.8125rem] text-stone">
        {test.variants.map((variant) => (
          <li key={variant}>{variant}</li>
        ))}
      </ul>
    </Card>
  );
}
