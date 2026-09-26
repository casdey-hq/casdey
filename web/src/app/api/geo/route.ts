import type { NextRequest } from "next/server";

// Cookieless PostHog drops the IP before its GeoIP step, so visitor countries
// come from Vercel's edge instead. Only the two-letter code leaves the server.
export function GET(request: NextRequest) {
  const country = request.headers.get("x-vercel-ip-country");
  return Response.json({ country: country && /^[A-Z]{2}$/.test(country) ? country : null }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
