import { describe, expect, it } from 'vitest';
import { bodies, type BodyData } from '../data/bodies';
import { elementsAt, heliocentricPosition, type Vec3 } from './kepler';
import {
  displayedMeridianDeg,
  MAX_VISIBLE_TURNS_PER_SECOND,
  orientationAtMeridian,
  orientationEcliptic,
  poleEcliptic,
  primeMeridianDeg,
  rotationPeriodHours,
  spinTurnsPerSecond,
} from './rotation';
import { dateToJd, JD_J2000 } from './time';

const body = (id: string): BodyData => bodies.find((b) => b.id === id)!;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (v: Vec3) => Math.hypot(...v);
const angleDeg = (a: Vec3, b: Vec3) => (Math.acos(Math.min(1, Math.max(-1, dot(a, b) / (norm(a) * norm(b))))) * 180) / Math.PI;

/** Bahnnormale aus den Kepler-Elementen (ekliptikal) */
function orbitNormal(b: BodyData, jd = JD_J2000): Vec3 {
  const { I, longNode } = elementsAt(b.orbit!, jd);
  return [Math.sin(I) * Math.sin(longNode), -Math.sin(I) * Math.cos(longNode), Math.cos(I)];
}

/**
 * Schiefe im Sinne der Rechte-Hand-Regel (Drehimpulsachse vs. Bahnnormale).
 * Der IAU-Nordpol zeigt bei rückläufigen Körpern entgegen der Drehimpulsachse.
 */
function obliquityDeg(b: BodyData): number {
  const pole = poleEcliptic(b.pole);
  const spinAxis: Vec3 = b.rotation.rate < 0 ? [-pole[0], -pole[1], -pole[2]] : pole;
  return angleDeg(spinAxis, orbitNormal(b));
}

describe('Achsneigung (IAU-Pole vs. Kepler-Bahnebene)', () => {
  // Referenz: NASA Planetary Fact Sheet
  it.each([
    ['mercury', 0.034],
    ['venus', 177.36],
    ['earth', 23.44],
    ['mars', 25.19],
    ['jupiter', 3.13],
    ['saturn', 26.73],
    ['uranus', 97.77],
    ['neptune', 28.32],
  ])('%s: %f°', (id, expected) => {
    expect(Math.abs(obliquityDeg(body(id)) - expected)).toBeLessThan(0.5);
  });
});

describe('Rotationsperioden', () => {
  it.each([
    ['earth', 23.9345],
    ['jupiter', 9.925],
    ['venus', -5832.5],
    ['uranus', -17.24],
  ])('%s: %f h', (id, hours) => {
    expect(rotationPeriodHours(body(id).rotation) / hours).toBeCloseTo(1, 2);
  });
});

describe('orientationEcliptic', () => {
  it.each(bodies)('$id: Basis ist orthonormal und rechtshändig', (b) => {
    const { meridian: m, pole: p, east: e } = orientationEcliptic(b.pole, b.rotation, 2460000.5);
    for (const v of [m, p, e]) expect(norm(v)).toBeCloseTo(1, 12);
    expect(dot(m, p)).toBeCloseTo(0, 12);
    expect(dot(m, e)).toBeCloseTo(0, 12);
    expect(dot(p, e)).toBeCloseTo(0, 12);
    // east = pole × meridian
    expect(e[0]).toBeCloseTo(p[1] * m[2] - p[2] * m[1], 12);
  });

  const sunFromEarth = (jd: number): Vec3 => {
    const [x, y, z] = heliocentricPosition(body('earth').orbit!, jd);
    return [-x, -y, -z];
  };

  it('Jahreszeiten: Erd-Nordpol im Juni zur Sonne geneigt, im Dezember weg', () => {
    const earth = body('earth');
    const june = dateToJd(new Date('2025-06-21T12:00:00Z'));
    const december = dateToJd(new Date('2025-12-21T12:00:00Z'));
    const tilt = (jd: number) => dot(orientationEcliptic(earth.pole, earth.rotation, jd).pole, sunFromEarth(jd)) / norm(sunFromEarth(jd));
    expect(tilt(june)).toBeGreaterThan(Math.sin(23 * Math.PI / 180));
    expect(tilt(december)).toBeLessThan(-Math.sin(23 * Math.PI / 180));
  });

  it.each([
    ['2000-01-01T12:00:00Z', 0],
    ['2026-03-20T12:00:00Z', 0],
    ['2026-06-21T00:00:00Z', 180],
    ['2026-09-23T18:00:00Z', -90],
  ])('Sonnenhöchststand: %s über Länge ≈ %i°', (iso, expectedLon) => {
    const earth = body('earth');
    const jd = dateToJd(new Date(iso));
    const { meridian, east } = orientationEcliptic(earth.pole, earth.rotation, jd);
    const s = sunFromEarth(jd);
    const lon = (Math.atan2(dot(s, east), dot(s, meridian)) * 180) / Math.PI;
    const diff = ((lon - expectedLon + 540) % 360) - 180;
    // Zeitgleichung ≤ ±16 min ≈ ±4°
    expect(Math.abs(diff)).toBeLessThan(5);
  });
});

describe('Sichtbare Eigenrotation', () => {
  const earth = body('earth');
  const jd = 2460000.5;

  it('orientationAtMeridian(W(jd)) entspricht orientationEcliptic(jd)', () => {
    const a = orientationEcliptic(earth.pole, earth.rotation, jd);
    const b = orientationAtMeridian(earth.pole, primeMeridianDeg(earth.rotation, jd));
    a.meridian.forEach((v, i) => expect(b.meridian[i]).toBeCloseTo(v, 12));
  });

  it('nutzt den exakten Winkel, solange die Drehung langsam genug ist', () => {
    // 1 Stunde/s → Erde 1/24 Umdrehung pro Sekunde
    expect(Math.abs(spinTurnsPerSecond(earth.rotation, 1 / 24))).toBeLessThan(MAX_VISIBLE_TURNS_PER_SECOND);
    expect(displayedMeridianDeg(earth.rotation, jd, 1 / 24, 0, 0.016)).toBe(primeMeridianDeg(earth.rotation, jd));
  });

  it('deckelt die Drehung bei hoher Zeitraffung und behält die Richtung', () => {
    // 1 Woche/s → Erde ≈ 7 Umdrehungen pro Sekunde
    const dt = 0.1;
    const step = MAX_VISIBLE_TURNS_PER_SECOND * 360 * dt;
    expect(displayedMeridianDeg(earth.rotation, jd, 7, 100, dt)).toBeCloseTo(100 + step);
    expect(displayedMeridianDeg(earth.rotation, jd, -7, 100, dt)).toBeCloseTo(100 - step); // rückwärts
    const uranus = body('uranus').rotation; // rückläufig: negatives Ẇ
    expect(displayedMeridianDeg(uranus, jd, 7, 100, dt)).toBeCloseTo(100 - step);
  });

  it('steht bei Pause still (exakter Winkel)', () => {
    expect(displayedMeridianDeg(earth.rotation, jd, 0, 123, 0.1)).toBe(primeMeridianDeg(earth.rotation, jd));
  });
});
