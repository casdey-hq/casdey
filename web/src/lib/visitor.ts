import "server-only";

import { headers } from "next/headers";

import { currencyFor, isCountryCode, type Currency } from "./countries";

/**
 * Where the person looking at a page is, from Vercel's edge geolocation.
 *
 * Only the two-letter country code is read, never the address, and it decides
 * nothing that matters: which currency a price is shown in first, and which
 * country a signup form starts on. A visitor can change both. Absent locally
 * and anywhere not behind Vercel, which is why every caller has a fallback.
 *
 * Reading headers makes the page render per request rather than once at build
 * time. That is the point: a static page cannot show a US visitor dollars and
 * an Irish one euros.
 */
export async function visitorCountry(): Promise<string | null> {
  const raw = (await headers()).get("x-vercel-ip-country");
  return raw && /^[A-Z]{2}$/.test(raw) ? raw : null;
}

/**
 * The currency to show a visitor first. Dollars in the US, pounds in the UK,
 * euros everywhere else, including every country casdey does not sell in yet,
 * because euros are what the rest of the site is written around.
 */
export async function visitorCurrency(): Promise<Currency> {
  const country = await visitorCountry();
  return country ? currencyFor(country) : "eur";
}

/** The signup form's starting country: the visitor's own if casdey sells there. */
export async function visitorSignupCountry(fallback = "GB"): Promise<string> {
  const country = await visitorCountry();
  return isCountryCode(country) ? country : fallback;
}
