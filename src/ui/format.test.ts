import { describe, expect, it } from 'vitest';
import { dateToJd, JD_J2000 } from '../sim/time';
import { formatUtc, parseDateInput, toDateInputValue } from './format';

describe('formatUtc', () => {
  it('formatiert J2000', () => {
    expect(formatUtc(JD_J2000)).toBe('2000-01-01 12:00 UTC');
  });

  it('bleibt lesbar außerhalb 0000–9999', () => {
    const d = new Date(0);
    d.setUTCFullYear(-1, 0, 1);
    expect(formatUtc(dateToJd(d))).toBe('-0001-01-01 00:00 UTC');
    expect(formatUtc(dateToJd(new Date(Date.UTC(12026, 5, 3, 7, 5))))).toBe('12026-06-03 07:05 UTC');
  });

  it('liefert – bei ungültigem Datum', () => {
    expect(formatUtc(Number.NaN)).toBe('–');
  });
});

describe('Datumsfeld', () => {
  it('parst gültige Werte als UTC-Mitternacht', () => {
    expect(parseDateInput('2000-01-01')).toBe(JD_J2000 - 0.5);
    // Date.UTC bildet Jahre 0–99 auf 1900–1999 ab; ISO-Strings tun das nicht
    const d = new Date(0);
    d.setUTCFullYear(50, 2, 1);
    expect(parseDateInput('0050-03-01')).toBe(dateToJd(d));
  });

  it('lehnt ungültige Werte ab statt NaN zu liefern', () => {
    for (const v of ['', '12026-01-01', '2026-13-45', 'abc']) expect(parseDateInput(v), v).toBeNull();
  });

  it('erzeugt Feldwerte nur im darstellbaren Bereich', () => {
    expect(toDateInputValue(JD_J2000)).toBe('2000-01-01');
    expect(toDateInputValue(dateToJd(new Date(Date.UTC(12026, 0, 1))))).toBe('');
    expect(toDateInputValue(Number.NaN)).toBe('');
  });
});
