// Stripe over its REST API (no SDK): the paid 90-day plan (2026-10-11). Checkout
// starts a subscription with a 7-day trial, card upfront; Stripe owns every
// charge after that. Prices live in the live account (product
// prod_VQI9U108D8AG35): €9.99 a month, €59.99 a year.
export type Interval = "month" | "year";

export const PLAN_PRICES: Record<Interval, { id: string; label: string }> = {
  year: { id: process.env.STRIPE_PLAN_PRICE_YEAR ?? "price_1UPRZTDGwemFDmSP4mbfg8aB", label: "€59.99 a year" },
  month: { id: process.env.STRIPE_PLAN_PRICE_MONTH ?? "price_1UPRZTDGwemFDmSPdqIZd92i", label: "€9.99 a month" },
};

export const TRIAL_DAYS = 7;

function key(): string {
  const value = process.env.STRIPE_PLAN_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!value) throw new Error("Stripe is not configured");
  return value;
}

/** Flattens {a: {b: 1}} into Stripe's form encoding: a[b]=1. */
function form(params: Record<string, unknown>, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const field = prefix ? `${prefix}[${name}]` : name;
    if (Array.isArray(value)) value.forEach((item, i) => (typeof item === "object" ? form(item as Record<string, unknown>, `${field}[${i}]`, out) : out.append(`${field}[${i}]`, String(item))));
    else if (typeof value === "object") form(value as Record<string, unknown>, field, out);
    else out.append(field, String(value));
  }
  return out;
}

export async function stripe<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params ? form(params) : undefined,
    cache: "no-store",
  });
  const body = (await response.json()) as T & { error?: { message: string } };
  if (!response.ok) throw new Error(`Stripe ${path}: ${body.error?.message ?? response.status}`);
  return body;
}
