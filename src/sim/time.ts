/**
 * Zeitbasis der Simulation: Julianisches Datum (JD).
 * Vereinfachung: UTC wird als TDB behandelt (ΔT ≈ 69 s). Der Positionsfehler ist dadurch vernachlässigbar
 * (Merkur ≈ 0,003°), deutlich kleiner als die Ungenauigkeit der Bahnelemente selbst.
 */
export const JD_J2000 = 2451545.0;
const JD_UNIX_EPOCH = 2440587.5;
const MS_PER_DAY = 86_400_000;
export const DAYS_PER_CENTURY = 36525;

export function dateToJd(date: Date): number {
  return date.getTime() / MS_PER_DAY + JD_UNIX_EPOCH;
}

export function jdToDate(jd: number): Date {
  return new Date((jd - JD_UNIX_EPOCH) * MS_PER_DAY);
}

/** Julianische Jahrhunderte seit J2000.0 */
export function centuriesSinceJ2000(jd: number): number {
  return (jd - JD_J2000) / DAYS_PER_CENTURY;
}
