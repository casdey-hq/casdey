import { Card, CardTitle, Stat } from "@/components/app/ui";
import { outreachConfigured, outreachSummary } from "@/lib/outreach-stats";
import { Section } from "./parts";

const LEADS_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1WOAIA1gvK6S1kWe_Vf4-d4XmjhnDLQZLtyU_ezvOu3w/edit";

/**
 * Cold outreach, read live from the Casdey-Gym-Leads sheet. Its own async
 * component inside a Suspense boundary so a slow Google read streams in after
 * the rest of /admin instead of holding the whole page.
 *
 * All time, not a reporting period — see src/lib/outreach-summary.ts.
 *
 * Engaged leads and reply rate are two different numbers on purpose, see
 * src/lib/outreach-summary.ts: a reply is usually a no thanks, an engaged lead
 * is a gym actually interested in casdey.
 */
export async function OutreachSection() {
  const summary = await outreachSummary();

  const rate = (value: number | null): string =>
    value === null
      ? "—"
      : `${value.toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`;

  return (
    <Section title="Outreach" sub="Cold email to gyms, live from the leads sheet. All time.">
      {!outreachConfigured() ? (
        <Card>
          <CardTitle>Leads sheet not connected</CardTitle>
          <p className="mt-2 text-[0.8125rem] text-stone">
            Set GOOGLE_SERVICE_ACCOUNT_JSON to the outreach service account&apos;s
            key. Every figure in this section stays blank until it is.
          </p>
        </Card>
      ) : summary === null ? (
        <Card>
          <CardTitle>Leads sheet did not answer</CardTitle>
          <p className="mt-2 text-[0.8125rem] text-stone">
            The key is set but Google did not come back. It is usually
            transient; reload in a minute.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Engaged leads"
              value={rate(summary.engagedRate)}
              hint={`${summary.engaged} of ${summary.contacted.toLocaleString("en-GB")} gyms interested${
                summary.engagedGyms.length > 0
                  ? ` · ${summary.engagedGyms.join(", ")}`
                  : ""
              }`}
              tone="teal"
            />
            <Stat
              label="Reply rate"
              value={rate(summary.replyRate)}
              hint={`${summary.genuineReplies} genuine replies · ${summary.optOuts} opt-outs · target 3%`}
            />
            <Stat label="Gyms contacted" value={summary.contacted.toLocaleString("en-GB")} />
            <Stat label="Emails sent" value={summary.emailsSent.toLocaleString("en-GB")} />
          </div>
          <p className="mt-3 text-[0.8125rem] text-stone">
            <a
              href={LEADS_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-ink"
            >
              Open the leads sheet ↗
            </a>
          </p>
        </>
      )}
    </Section>
  );
}
