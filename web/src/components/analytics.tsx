"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// Cookieless PostHog (EU): nothing is stored on the visitor's device, so no
// cookie banner is needed. Pageviews and the waitlist_joined event only.
export function Analytics() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      persistence: "memory",
      disable_session_recording: true,
      autocapture: false,
      capture_pageview: true,
    });
  }, []);
  return null;
}
