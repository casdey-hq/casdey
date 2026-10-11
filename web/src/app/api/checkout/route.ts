import type { NextRequest } from "next/server";
import { supabase } from "@/lib/db";
import { PLAN_PRICES, TRIAL_DAYS, stripe, type Interval } from "@/lib/stripe";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f-]{36}$/i;

// Starts the paid 90-day plan: a Stripe Checkout subscription with a 7-day
// trial, card upfront. The analysis row id rides along so the welcome page can
// tie the trial to the person's answers and levers.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Something went wrong. Try again." }, { status: 400 });
  }
  const interval: Interval = body.interval === "month" ? "month" : "year";
  const email = typeof body.email === "string" && EMAIL.test(body.email.trim()) ? body.email.trim().toLowerCase() : undefined;
  const analysis = typeof body.analysis === "string" && UUID.test(body.analysis) ? body.analysis : undefined;
  if (body.consent !== true) {
    return Response.json({ error: "Tick the box to agree to the terms first." }, { status: 400 });
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost") ? process.env.NEXT_PUBLIC_SITE_URL : request.nextUrl.origin;
  try {
    const session = await stripe<{ id: string; url: string }>("checkout/sessions", {
      mode: "subscription",
      line_items: [{ price: PLAN_PRICES[interval].id, quantity: 1 }],
      subscription_data: { trial_period_days: TRIAL_DAYS, metadata: { analysis: analysis ?? "" } },
      payment_method_collection: "always",
      customer_email: email,
      client_reference_id: analysis,
      metadata: { analysis: analysis ?? "", interval },
      allow_promotion_codes: "false",
      success_url: `${origin}/plan/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/analysis`,
    });
    if (analysis) {
      await supabase(`analyses?id=eq.${analysis}`, { method: "PATCH", body: JSON.stringify({ stripe_session_id: session.id, plan_status: "checkout" }) });
    }
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("checkout failed", error);
    return Response.json({ error: "Checkout couldn't open. Try again in a moment." }, { status: 502 });
  }
}
