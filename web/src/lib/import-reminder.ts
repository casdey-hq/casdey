const DAY = 86_400_000;

/** A member list starts to lose value quickly when visits, returns and
 * cancellations are only recorded in the gym's source software. Four weeks
 * is frequent enough to keep campaigns current without asking a busy owner to
 * export every week. */
export const IMPORT_REFRESH_DAYS = 28;

export type ImportRefreshReminder = {
  daysSinceImport: number;
};

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Returns a dashboard reminder once the latest completed member import is a
 * month old. Date-only arithmetic means the wording does not flicker around
 * midnight depending on where the server happens to run. */
export function importRefreshReminder(
  lastImportAt: string | null | undefined,
  now = new Date(),
): ImportRefreshReminder | null {
  if (!lastImportAt || Number.isNaN(now.getTime())) return null;

  const imported = new Date(lastImportAt);
  if (Number.isNaN(imported.getTime())) return null;

  const daysSinceImport = Math.max(
    0,
    Math.floor((startOfUtcDay(now) - startOfUtcDay(imported)) / DAY),
  );

  return daysSinceImport >= IMPORT_REFRESH_DAYS ? { daysSinceImport } : null;
}
