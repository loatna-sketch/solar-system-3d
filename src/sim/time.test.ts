import { describe, expect, it } from 'vitest';
import { centuriesSinceJ2000, dateToJd, JD_J2000, jdToDate } from './time';

describe('Julianisches Datum', () => {
  it('J2000.0 = 2000-01-01T12:00Z', () => {
    expect(dateToJd(new Date('2000-01-01T12:00:00Z'))).toBe(JD_J2000);
    expect(centuriesSinceJ2000(JD_J2000)).toBe(0);
  });

  it('stimmt mit Meeus (Beispiel 7.a) überein', () => {
    expect(dateToJd(new Date('1987-04-10T00:00:00Z'))).toBe(2446895.5);
  });

  it('rechnet verlustfrei hin und zurück', () => {
    const d = new Date('2026-11-19T21:30:00Z');
    expect(jdToDate(dateToJd(d)).getTime()).toBe(d.getTime());
  });

  it('liefert ein Jahrhundert nach 36525 Tagen', () => {
    expect(centuriesSinceJ2000(JD_J2000 + 36525)).toBe(1);
  });
});
