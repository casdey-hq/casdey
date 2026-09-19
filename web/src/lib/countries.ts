/**
 * The markets casdey sells into: the United States (the outreach target from
 * 2026-09-19), the UK and Ireland, plus the EU countries the outreach has
 * already reached. Currency follows the country, because that is what a gym
 * expects to be billed in.
 *
 * The country also sets the timezone, except where one country spans several.
 * There the gym picks from `timezones`, because a gym in Los Angeles running on
 * New York time would offer every member booking slots three hours out.
 */

export type CountryCode =
  | "US"
  | "GB"
  | "IE"
  | "NL"
  | "DE"
  | "PT"
  | "ES"
  | "FR"
  | "IT"
  | "BE"
  | "AT";

export type Currency = "gbp" | "eur" | "usd";

export const CURRENCIES: Currency[] = ["eur", "usd", "gbp"];

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as string[]).includes(value);
}

/**
 * The currency on a Stripe object, as casdey's own type. Stripe reports it in
 * lower case, which is what casdey stores. This used to read "pounds if gbp,
 * otherwise euros", which is exactly how a dollar payment would have been
 * written down as euros the day the first US gym paid.
 */
export function currencyFromStripe(
  value: string | null | undefined,
  fallback: Currency = "eur",
): Currency {
  const lower = value?.toLowerCase();
  return isCurrency(lower) ? lower : fallback;
}

export const COUNTRIES: {
  code: CountryCode;
  name: string;
  /** The default, and the only choice where `timezones` is absent. */
  timezone: string;
  /** Present when the country spans more than one timezone. */
  timezones?: { value: string; label: string }[];
}[] = [
  {
    code: "US",
    name: "United States",
    timezone: "America/New_York",
    timezones: [
      { value: "America/New_York", label: "Eastern (New York)" },
      { value: "America/Chicago", label: "Central (Chicago)" },
      { value: "America/Denver", label: "Mountain (Denver)" },
      { value: "America/Phoenix", label: "Arizona (Phoenix)" },
      { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
      { value: "America/Anchorage", label: "Alaska (Anchorage)" },
      { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
    ],
  },
  { code: "GB", name: "United Kingdom", timezone: "Europe/London" },
  { code: "IE", name: "Ireland", timezone: "Europe/Dublin" },
  { code: "NL", name: "Netherlands", timezone: "Europe/Amsterdam" },
  { code: "DE", name: "Germany", timezone: "Europe/Berlin" },
  { code: "BE", name: "Belgium", timezone: "Europe/Brussels" },
  { code: "FR", name: "France", timezone: "Europe/Paris" },
  { code: "ES", name: "Spain", timezone: "Europe/Madrid" },
  { code: "PT", name: "Portugal", timezone: "Europe/Lisbon" },
  { code: "IT", name: "Italy", timezone: "Europe/Rome" },
  { code: "AT", name: "Austria", timezone: "Europe/Vienna" },
];

export function isCountryCode(value: unknown): value is CountryCode {
  return (
    typeof value === "string" && COUNTRIES.some((c) => c.code === value)
  );
}

/** The US bills in dollars, the UK in pounds, everywhere else in euros. */
export function currencyFor(country: string): Currency {
  if (country === "US") return "usd";
  return country === "GB" ? "gbp" : "eur";
}

/**
 * The timezone a gym runs on. A chosen zone is honoured only when it belongs to
 * the country, so a posted form cannot pair Germany with Hawaii; anything else
 * falls back to the country's default.
 */
export function timezoneFor(country: string, chosen?: string | null): string {
  const entry = COUNTRIES.find((c) => c.code === country);
  if (!entry) return "Europe/London";
  if (chosen && entry.timezones?.some((t) => t.value === chosen)) return chosen;
  return entry.timezone;
}

export function countryName(country: string): string {
  return COUNTRIES.find((c) => c.code === country)?.name ?? country;
}

/**
 * The date order a gym's own software most likely exports in. US systems
 * write month first (03/04 is 4 March); everyone else here writes day first.
 * Only a starting point: the import screen still lets the gym change it, and
 * reads the file itself when the dates settle the question.
 */
export function dateOrderFor(country: string): "mdy" | "dmy" {
  return country === "US" ? "mdy" : "dmy";
}
