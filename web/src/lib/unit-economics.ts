/**
 * What one paying gym earns casdey in a month, and how many cover the bill.
 *
 * This was a hand-typed table in the casdey HQ Google Doc, which went stale
 * the day a price or a cost moved. It is now worked out from the prices the
 * checkout actually charges (src/lib/pricing.ts) and the cost lines in
 * hq_costs, so it moves with them. Pure, tested in unit-economics.test.ts.
 *
 * The per-message and payment figures are assumptions, named here and shown
 * on the page, not measurements: casdey has no paying gym yet to measure.
 */

/** A 200-member list, a first message and two follow-ups. */
export const MESSAGES_PER_GYM_MONTH = 600;
/** Claude Haiku writes each message: about $0.002, in euros. */
export const AI_EUR_PER_MESSAGE = 0.0018;
/** Stripe, European card: 1.5% plus 25 cents. */
export const STRIPE_PERCENT = 1.5;
export const STRIPE_FIXED_EUR = 0.25;
/** WhatsApp is Pro only and priced per message by country; a heavy month. */
export const WHATSAPP_EUR_HEAVY = 13;

export type TierEconomics = {
  tier: "standard" | "pro";
  revenue: number;
  stripe: number;
  ai: number;
  whatsapp: number;
  margin: number;
  marginPct: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function tierEconomics(
  tier: "standard" | "pro",
  monthlyListEur: number,
  discountPercent: number,
): TierEconomics {
  const revenue = monthlyListEur * (1 - discountPercent / 100);
  const stripe = revenue * (STRIPE_PERCENT / 100) + STRIPE_FIXED_EUR;
  const ai = MESSAGES_PER_GYM_MONTH * AI_EUR_PER_MESSAGE;
  const whatsapp = tier === "pro" ? WHATSAPP_EUR_HEAVY : 0;
  const margin = revenue - stripe - ai - whatsapp;
  return {
    tier,
    revenue: round2(revenue),
    stripe: round2(stripe),
    ai: round2(ai),
    whatsapp,
    margin: round2(margin),
    marginPct: revenue > 0 ? Math.round((margin / revenue) * 100) : 0,
  };
}

/**
 * Gyms needed to cover the fixed monthly bill, on the cheaper tier's margin,
 * the conservative reading. Zero fixed cost still needs no gyms; any cost at
 * all needs at least one.
 */
export function breakEvenGyms(fixedMonthlyEur: number, cheapestMargin: number): number | null {
  if (fixedMonthlyEur <= 0) return 0;
  if (cheapestMargin <= 0) return null;
  return Math.ceil(fixedMonthlyEur / cheapestMargin);
}
