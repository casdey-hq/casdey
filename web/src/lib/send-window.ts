/**
 * When a gym's campaign email may leave: its members' daytime, in the gym's
 * own timezone.
 *
 * Sending used to happen whenever the daily cron fired, 03:00 UTC. That is
 * about 4am in Europe and 11pm in New York, so a win-back email from a US gym
 * landed at bedtime and one from a European gym sat under a night's worth of
 * other mail by breakfast. The fix is not a better single hour, because there
 * is none that suits Dublin and Los Angeles at once. It is several drains a
 * day (web/vercel.json) with each gym sending only in the one that falls in its
 * own daytime.
 *
 * Pure, so the hours can be tested against real timezones without a clock.
 */

/** First local hour a gym's email may go out, inclusive. */
export const SEND_WINDOW_START = 8;
/** Local hour sending stops, exclusive: nothing leaves at 20:00 or later. */
export const SEND_WINDOW_END = 20;

/** The hour of the day, 0 to 23, at `now` in `timezone`. */
export function localHour(timezone: string, now: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  return Number(hour);
}

/**
 * Whether a gym in `timezone` may send at `now`.
 *
 * An unknown or malformed timezone answers true: that is how every gym sent
 * before this existed, and holding a gym's whole campaign back forever over a
 * bad settings value is worse than an email at an odd hour.
 */
export function inSendWindow(timezone: string | null | undefined, now: Date): boolean {
  if (!timezone) return true;
  let hour: number;
  try {
    hour = localHour(timezone, now);
  } catch {
    return true;
  }
  return hour >= SEND_WINDOW_START && hour < SEND_WINDOW_END;
}
