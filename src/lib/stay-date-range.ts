/**
 * Date-only stay intervals [checkIn, checkOut) for overlap with blocks/leases.
 * Aligns with AvailabilityCalendar: occupied day d if d >= start && d < end (end exclusive).
 */

export function parseDateOnlyInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) {
    return null;
  }
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/** True if [aStart, aEnd) overlaps [bStart, bEnd) (half-open by calendar day). */
export function stayRangesOverlap(
  aStart: Date,
  aEndExclusive: Date,
  bStart: Date,
  bEndExclusive: Date
): boolean {
  const aS = aStart.getTime();
  const aE = aEndExclusive.getTime();
  const bS = bStart.getTime();
  const bE = bEndExclusive.getTime();
  return aS < bE && bS < aE;
}
