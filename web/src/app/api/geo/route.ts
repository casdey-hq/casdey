import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The visitor's country, as a two-letter code, for the analytics snippet in
 * components/posthog-provider.tsx to register before its first pageview.
 *
 * Why this exists: PostHog runs cookieless on casdey.com, and in that mode the
 * connection's IP address is discarded before PostHog's own GeoIP step can
 * read it. Found 2026-09-13: not one of 516 pageviews carried a country, while
 * a probe event sending an explicit $ip was located without trouble. Vercel
 * already resolves the country at the edge and passes it on as
 * x-vercel-ip-country, so the code is read here and only the code travels. The
 * address itself is never sent anywhere or stored.
 *
 * Locally, and anywhere not behind Vercel, the header is absent and this
 * answers null; /admin then falls back to the browser's time zone.
 */
export function GET(request: NextRequest): Response {
  const raw = request.headers.get("x-vercel-ip-country");
  const country = raw && /^[A-Z]{2}$/.test(raw) ? raw : null;
  return NextResponse.json(
    { country },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
