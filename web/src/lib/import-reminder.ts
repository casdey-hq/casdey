const DAY = 86_400_000;

/** A member list starts to lose value quickly when visits, returns and
 * cancellations are only recorded in the gym's source software. Four weeks
 * is frequent enough to keep campaigns current without asking a busy owner to
 * export every week. */
export const IMPORT_REFRESH_DAYS = 28;

export type ImportRefreshReminder = {
  daysSinceImport: number;
};

export type ImportRefreshSchedule = {
  daysSinceImport: number;
  nextRefreshAt: Date;
};

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Calculate the next suggested refresh from the latest completed import.
 * Date-only arithmetic keeps the schedule stable around midnight. */
export function importRefreshSchedule(
  lastImportAt: string | null | undefined,
  now = new Date(),
): ImportRefreshSchedule | null {
  if (!lastImportAt || Number.isNaN(now.getTime())) return null;

  const imported = new Date(lastImportAt);
  if (Number.isNaN(imported.getTime()) || imported.getTime() > now.getTime()) return null;

  const daysSinceImport = Math.max(
    0,
    Math.floor((startOfUtcDay(now) - startOfUtcDay(imported)) / DAY),
  );

  return {
    daysSinceImport,
    nextRefreshAt: new Date(startOfUtcDay(imported) + IMPORT_REFRESH_DAYS * DAY),
  };
}

export function importRefreshReminder(
  lastImportAt: string | null | undefined,
  now = new Date(),
): ImportRefreshReminder | null {
  const schedule = importRefreshSchedule(lastImportAt, now);
  return schedule && schedule.daysSinceImport >= IMPORT_REFRESH_DAYS
    ? { daysSinceImport: schedule.daysSinceImport }
    : null;
}
