"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

// Cookieless PostHog (EU): nothing is stored on the visitor's device, so no
// cookie banner is needed. Pageviews and the analysis_* funnel events only
// (waitlist_joined before 2026-10-05); /admin is never
// tracked. Each visit carries visitor_country from /api/geo, because
// cookieless mode drops the IP that PostHog would locate, and utm_source when
// the visit came through a bio link.
export function Analytics() {
  const pathname = usePathname();
  const ready = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || pathname.startsWith("/admin")) return;
    if (!ready.current) {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
        persistence: "memory",
        disable_session_recording: true,
        autocapture: false,
        capture_pageview: false,
      });
      // The bio links (/tt, /ig, /yt) land with utm_source. Register it so every
      // event of the visit carries it, the analysis events included.
      const platform = new URLSearchParams(window.location.search).get("utm_source");
      if (platform) posthog.register({ utm_source: platform.slice(0, 40) });
      ready.current = fetch("/api/geo")
        .then((response) => response.json())
        .then((body: { country: string | null }) => {
          if (body.country) posthog.register({ visitor_country: body.country });
        })
        .catch(() => undefined);
    }
    ready.current.then(() => posthog.capture("$pageview"));
  }, [pathname]);

  return null;
}
