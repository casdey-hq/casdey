"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

/**
 * The visitor half of casdey's own analytics, wired at the root so it covers
 * both the marketing site and /app (see the 2026-09-08 admin-dashboard
 * planning note in CLAUDE.md for why casdey needed this at all).
 *
 * Cookieless on purpose: `cookieless_mode: "always"` sets no cookies and no
 * session/local storage, identifying a visitor with a privacy-preserving hash
 * PostHog computes server-side instead. That is what lets this run with no
 * consent banner on a site that had none before. It only works because the
 * matching "Enable cookieless tracking" toggle was turned on in the PostHog
 * project itself (Settings → Web analytics) — the client flag alone silently
 * drops events if that project-level switch is off.
 *
 * capture_pageview is off in init() and fired by hand below: the App Router
 * does client-side route transitions that never reload the page, so the
 * library's own "fires once on load" pageview would miss every navigation
 * after the first.
 *
 * The country is registered before the first pageview goes out, from
 * /api/geo. Cookieless mode discards the connection's IP before PostHog's
 * GeoIP step can read it, so until 2026-09-13 not one pageview carried a
 * country (see that route for how it was pinned down). Only the two-letter
 * code Vercel resolved at the edge is sent, never the address.
 */

let initialised = false;
/** Settles once the country is registered, or the lookup has given up.
 *  Pageviews wait on it so the first one carries the country too. */
let countryReady: Promise<void> = Promise.resolve();
const COUNTRY_LOOKUP_TIMEOUT_MS = 1500;

function initPosthog(): boolean {
  if (initialised) return true;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  // Not configured (e.g. a preview environment with no PostHog project) — the
  // site works exactly as it did before this existed, it just is not measured.
  if (!key || !host) return false;

  posthog.init(key, {
    api_host: host,
    cookieless_mode: "always",
    capture_pageview: false,
    autocapture: true,
  });
  initialised = true;
  countryReady = registerCountry();
  return true;
}

async function registerCountry(): Promise<void> {
  const lookup = fetch("/api/geo", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((body: { country?: unknown } | null) => {
      const country = body?.country;
      if (typeof country === "string" && /^[A-Z]{2}$/.test(country)) {
        posthog.register({ visitor_country: country });
      }
    })
    .catch(() => {});
  // A slow lookup must never cost the pageview itself.
  await Promise.race([
    lookup,
    new Promise<void>((resolve) =>
      setTimeout(resolve, COUNTRY_LOOKUP_TIMEOUT_MS),
    ),
  ]);
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialised here too, not only in the provider: React runs a child's
    // effects before its parent's, so this is the first code to run on load.
    if (!initPosthog()) return;
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    void countryReady.then(() => {
      posthog.capture("$pageview", { $current_url: url });
    });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider() {
  useEffect(() => {
    initPosthog();
  }, []);

  // useSearchParams() requires a Suspense boundary; this component renders
  // nothing, so there is nothing for a fallback to show.
  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  );
}
