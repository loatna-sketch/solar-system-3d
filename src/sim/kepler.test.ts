import { describe, expect, it } from 'vitest';
import { bodies, type OrbitalElements } from '../data/bodies';
import { elementsAt, heliocentricPosition, orbitPoints, solveKepler, type Vec3 } from './kepler';
import fixture from './__fixtures__/horizons.json';

const orbitOf = (id: string): OrbitalElements => {
  const orbit = bodies.find((b) => b.id === id)?.orbit;
  if (!orbit) throw new Error(`kein Orbit für ${id}`);
  return orbit;
};
const planets = bodies.filter((b) => b.orbit);
const norm = (v: Vec3) => Math.hypot(...v);
const angleDeg = (a: Vec3, b: Vec3) => {
  const cos = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (norm(a) * norm(b));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
};

describe('solveKepler', () => {
  it('erfüllt E − e·sin E = M für e ∈ [0, 0.9]', () => {
    for (const e of [0, 0.01, 0.2, 0.5, 0.8, 0.9]) {
      for (let M = -Math.PI; M < Math.PI; M += 0.1) {
        const E = solveKepler(M, e);
        expect(E - e * Math.sin(E), `e=${e} M=${M}`).toBeCloseTo(M, 9);
      }
    }
  });

  it('liefert E = M für Kreisbahnen', () => {
    expect(solveKepler(1.234, 0)).toBe(1.234);
  });
});

describe('heliocentricPosition', () => {
  it.each(planets)('$id bleibt zwischen Perihel und Aphel', ({ orbit }) => {
    for (let jd = 2396758.5; jd < 2469807.5; jd += 997) {
      const { a, e } = elementsAt(orbit!, jd);
      const r = norm(heliocentricPosition(orbit!, jd));
      expect(r).toBeGreaterThanOrEqual(a * (1 - e) - 1e-9);
      expect(r).toBeLessThanOrEqual(a * (1 + e) + 1e-9);
    }
  });

  // JPL gibt für Tabelle 1 Fehler bis ~600″ (Saturn) an; ein Formelfehler läge um Größenordnungen darüber.
  it.each(fixture.samples)('$id @ JD $jd stimmt mit JPL Horizons überein', ({ id, jd, x, y, z }) => {
    const ref: Vec3 = [x, y, z];
    const pos = heliocentricPosition(orbitOf(id), jd);
    expect(angleDeg(pos, ref)).toBeLessThan(0.25);
    expect(Math.abs(norm(pos) - norm(ref)) / norm(ref)).toBeLessThan(0.01);
  });
});

describe('orbitPoints', () => {
  it('enthält das Perihel und liegt auf der Ellipse', () => {
    const orbit = orbitOf('mars');
    const jd = 2451545.0;
    const { a, e } = elementsAt(orbit, jd);
    const pts = orbitPoints(orbit, jd, 64);
    expect(pts).toHaveLength(64);
    expect(norm(pts[0])).toBeCloseTo(a * (1 - e), 12);
    for (const p of pts) {
      expect(norm(p)).toBeGreaterThanOrEqual(a * (1 - e) - 1e-12);
      expect(norm(p)).toBeLessThanOrEqual(a * (1 + e) + 1e-12);
    }
  });
});
