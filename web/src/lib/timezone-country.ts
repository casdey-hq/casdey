/**
 * A country from a browser's IANA time zone, for /admin's Countries list.
 *
 * The fallback, not the source: new visits carry the country Vercel resolved
 * from the connection (see app/api/geo/route.ts). Every visit recorded before
 * that existed has no country at all, but posthog-js has always sent
 * $timezone, and a zone like Europe/Dublin names its country about as reliably
 * as an IP lookup does. Only zones plausible for casdey's traffic are listed;
 * anything else reads as unknown rather than being guessed at.
 */
const ZONE_COUNTRY: Record<string, string> = {
  // Europe, casdey's market
  "Europe/Amsterdam": "NL",
  "Europe/Andorra": "AD",
  "Europe/Athens": "GR",
  "Europe/Belgrade": "RS",
  "Europe/Berlin": "DE",
  "Europe/Bratislava": "SK",
  "Europe/Brussels": "BE",
  "Europe/Bucharest": "RO",
  "Europe/Budapest": "HU",
  "Europe/Copenhagen": "DK",
  "Europe/Dublin": "IE",
  "Europe/Gibraltar": "GI",
  "Europe/Guernsey": "GG",
  "Europe/Helsinki": "FI",
  "Europe/Isle_of_Man": "IM",
  "Europe/Istanbul": "TR",
  "Europe/Jersey": "JE",
  "Europe/Kiev": "UA",
  "Europe/Kyiv": "UA",
  "Europe/Lisbon": "PT",
  "Europe/Ljubljana": "SI",
  "Europe/London": "GB",
  "Europe/Luxembourg": "LU",
  "Europe/Madrid": "ES",
  "Europe/Malta": "MT",
  "Europe/Monaco": "MC",
  "Europe/Moscow": "RU",
  "Europe/Oslo": "NO",
  "Europe/Paris": "FR",
  "Europe/Prague": "CZ",
  "Europe/Riga": "LV",
  "Europe/Rome": "IT",
  "Europe/San_Marino": "SM",
  "Europe/Sofia": "BG",
  "Europe/Stockholm": "SE",
  "Europe/Tallinn": "EE",
  "Europe/Vaduz": "LI",
  "Europe/Vatican": "VA",
  "Europe/Vienna": "AT",
  "Europe/Vilnius": "LT",
  "Europe/Warsaw": "PL",
  "Europe/Zagreb": "HR",
  "Europe/Zurich": "CH",
  "Atlantic/Azores": "PT",
  "Atlantic/Canary": "ES",
  "Atlantic/Madeira": "PT",
  "Atlantic/Reykjavik": "IS",
  "Africa/Ceuta": "ES",
  // Elsewhere
  "America/Anchorage": "US",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Mexico_City": "MX",
  "America/New_York": "US",
  "America/Phoenix": "US",
  "America/Sao_Paulo": "BR",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Africa/Cairo": "EG",
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Asia/Calcutta": "IN",
  "Asia/Dubai": "AE",
  "Asia/Hong_Kong": "HK",
  "Asia/Kolkata": "IN",
  "Asia/Shanghai": "CN",
  "Asia/Singapore": "SG",
  "Asia/Tokyo": "JP",
  "Australia/Brisbane": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Perth": "AU",
  "Australia/Sydney": "AU",
  "Pacific/Auckland": "NZ",
};

export function countryFromTimezone(
  zone: string | null | undefined,
): string | null {
  if (!zone) return null;
  return ZONE_COUNTRY[zone] ?? null;
}

let displayNames: Intl.DisplayNames | undefined;

/** "IT" → "Italy". Falls back to the code itself if the runtime has no name. */
export function regionName(code: string): string {
  try {
    displayNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}
