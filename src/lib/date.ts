const ARGENTINA_OFFSET_MS = -3 * 60 * 60 * 1000;

/** Returns YYYY-MM-DD in Argentina time (UTC-3). */
export function getArgentinaDateString(date = new Date()): string {
  const shifted = new Date(date.getTime() + ARGENTINA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses YYYY-MM-DD into a Date at the start or end of day in UTC-3. */
export function parseArgentinaDayBoundary(
  dateStr: string,
  endOfDay: boolean
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  const suffix = endOfDay ? "T23:59:59.999-03:00" : "T00:00:00.000-03:00";
  const parsed = new Date(`${dateStr}${suffix}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Returns start of the current Argentina day (UTC-3). */
export function getArgentinaTodayStart(): Date {
  return parseArgentinaDayBoundary(getArgentinaDateString(), false)!;
}
