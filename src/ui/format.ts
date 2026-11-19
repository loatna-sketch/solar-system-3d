import { dateToJd, jdToDate } from '../sim/time';

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** Astronomische Jahreszählung: …, −0001, 0000, 0001, … */
const formatYear = (y: number) => (y < 0 ? `-${pad(-y, 4)}` : pad(y, 4));

/** „YYYY-MM-DD hh:mm UTC“; funktioniert auch außerhalb 0000–9999 (anders als toISOString) */
export function formatUtc(jd: number): string {
  const d = jdToDate(jd);
  if (Number.isNaN(d.getTime())) return '–';
  return (
    `${formatYear(d.getUTCFullYear())}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
  );
}

/** Wert für <input type="date">; '' außerhalb 0001–9999, weil das Feld das nicht darstellen kann */
export function toDateInputValue(jd: number): string {
  const d = jdToDate(jd);
  const y = d.getUTCFullYear();
  if (Number.isNaN(y) || y < 1 || y > 9999) return '';
  return `${pad(y, 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Parst „YYYY-MM-DD“ aus <input type="date"> als UTC-Mitternacht; null bei ungültigem Wert */
export function parseDateInput(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const jd = dateToJd(new Date(`${value}T00:00:00Z`));
  return Number.isFinite(jd) ? jd : null;
}
