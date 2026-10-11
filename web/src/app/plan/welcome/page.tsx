import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteNav } from "@/components/site-chrome";
import { supabase } from "@/lib/db";
import { notifyDavide, sendWelcome } from "@/lib/plan-email";
import { PLAN_PRICES, stripe, type Interval } from "@/lib/stripe";

export const metadata: Metadata = { title: "You're in · Casdey", robots: { index: false } };
export const dynamic = "force-dynamic";

type Session = {
  id: string;
  status: string;
  customer: string | null;
  customer_details: { email: string | null } | null;
  client_reference_id: string | null;
  metadata: { interval?: string };
  subscription: { id: string; trial_end: number | null } | null;
};

/** Records the trial once, emails the person and Davide. Safe to reload. */
async function record(sessionId: string): Promise<{ email: string; trialEnds: Date } | null> {
  const session = await stripe<Session>(`checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`);
  if (session.status !== "complete" || !session.subscription) return null;
  const email = session.customer_details?.email ?? "";
  const interval: Interval = session.metadata.interval === "month" ? "month" : "year";
  const trialEnds = new Date((session.subscription.trial_end ?? Date.now() / 1000) * 1000);
  const analysis = session.client_reference_id;

  type Row = { plan_status: string | null; goal?: string; answers?: unknown; result?: unknown };
  let row: Row | null = null;
  if (analysis) {
    const found = await supabase(`analyses?id=eq.${analysis}&select=plan_status,goal,answers,result`);
    row = found.ok ? ((await found.json()) as Row[])[0] ?? null : null;
  }
  const already = row?.plan_status === "trial";
  if (!already) {
    if (analysis) {
      await supabase(`analyses?id=eq.${analysis}`, {
        method: "PATCH",
        body: JSON.stringify({
          plan_status: "trial",
          plan_interval: interval,
          plan_started_at: new Date().toISOString(),
          stripe_session_id: session.id,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription.id,
        }),
      });
    }
    await Promise.all([
      email ? sendWelcome(email, trialEnds, PLAN_PRICES[interval].label) : Promise.resolve(false),
      notifyDavide({ email, interval, analysis, goal: row?.goal, answers: row?.answers, result: row?.result }),
    ]);
  }
  return { email, trialEnds };
}

export default async function Welcome({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let done: { email: string; trialEnds: Date } | null = null;
  try {
    done = session_id ? await record(session_id) : null;
  } catch (error) {
    console.error("welcome failed", error);
  }
  const day = done ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(done.trialEnds) : null;
  return (
    <>
      <SiteNav />
      <main className="legal">
        <div className="wrap">
          {done ? (
            <>
              <h1>You&rsquo;re in.</h1>
              <p>Your 90-day plan is being written for you now, from your answers and your 3 levers. It reaches {done.email || "your inbox"} within 24 hours.</p>
              <p>Your free trial runs until {day}. Nothing is charged before then, and you can cancel any time by replying &ldquo;cancel&rdquo; to any Casdey email.</p>
              <p>While you wait: check your inbox. Replying with a clear, front-facing photo in daylight makes your plan sharper.</p>
            </>
          ) : (
            <>
              <h1>Almost there</h1>
              <p>We couldn&rsquo;t confirm your trial. If you completed checkout, it&rsquo;s fine: write to info@casdey.com and we&rsquo;ll sort it out. Otherwise you can <Link href="/analysis">go back to your analysis</Link>.</p>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
