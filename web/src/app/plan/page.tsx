import type { Metadata } from "next";
import Link from "next/link";
import { PlanOffer } from "@/components/analysis-flow";
import { SiteFooter, SiteNav } from "@/components/site-chrome";
import { supabase } from "@/lib/db";

export const metadata: Metadata = { title: "Your 90-day plan · Casdey", robots: { index: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

// The link in the analysis email: the same offer as under the result, for
// someone who closed the page and came back from their inbox.
export default async function Plan({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const { a } = await searchParams;
  type Row = { id: string; email: string; result: { score?: number; potential?: number } | null };
  let row: Row | null = null;
  if (a && UUID.test(a)) {
    const found = await supabase(`analyses?id=eq.${a}&select=id,email,result`).catch(() => null);
    row = found?.ok ? ((await found.json()) as Row[])[0] ?? null : null;
  }
  const score = row?.result?.score;
  const potential = row?.result?.potential;
  return (
    <>
      <SiteNav />
      <main className="legal">
        <div className="wrap flow-step plan-page">
          {row && score && potential ? (
            <PlanOffer analysis={row.id} email={row.email} score={score} potential={potential} />
          ) : (
            <>
              <h1>Your 90-day plan starts with your analysis</h1>
              <p className="flow-sub">Get your free score and your 3 levers first, then start the plan from your result.</p>
              <Link className="btn btn-link" href="/analysis">Get my free analysis</Link>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
