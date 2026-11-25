import { describe, expect, it } from 'vitest';
import { bodies } from './data/bodies';
import {
  AU_KM,
  blendScale,
  COMPRESSED,
  REAL,
  sceneDistance,
  sceneExtent,
  sceneRadius,
  sceneRingRadius,
  toScene,
  toSceneDirection,
  type ScaleConfig,
} from './scale';

type Body = (typeof bodies)[number];
const semiMajorAxis = (b: Body) => b.orbit?.a[0] ?? 0;
const perihelion = (b: Body) => semiMajorAxis(b) * (1 - (b.orbit?.e[0] ?? 0));
const aphelion = (b: Body) => semiMajorAxis(b) * (1 + (b.orbit?.e[0] ?? 0));

describe('Skalierung', () => {
  it('ist streng monoton', () => {
    expect(sceneRadius(2000)).toBeLessThan(sceneRadius(3000));
    expect(sceneDistance(1)).toBeLessThan(sceneDistance(2));
  });

  it('bildet 1 AU auf distanceFactor ab', () => {
    expect(sceneDistance(1)).toBeCloseTo(COMPRESSED.distanceFactor);
  });

  it('erhält die Größenreihenfolge der Körper', () => {
    const byKm = [...bodies].sort((a, b) => a.radiusKm - b.radiusKm).map((b) => b.id);
    const byScene = [...bodies].sort((a, b) => sceneRadius(a.radiusKm) - sceneRadius(b.radiusKm)).map((b) => b.id);
    expect(byScene).toEqual(byKm);
  });

  it.each([0, 0.1, 0.25, 0.5, 0.75, 0.9, 1])(
    'lässt bei Überblendung t = %s keine Körper überlappen (Aphel innen vs. Perihel außen, inkl. Sonne und Ringe)',
    (t) => {
      const cfg = blendScale(COMPRESSED, REAL, t);
      const sorted = [...bodies].sort((a, b) => semiMajorAxis(a) - semiMajorAxis(b));
      for (let i = 1; i < sorted.length; i++) {
        const inner = sorted[i - 1];
        const outer = sorted[i];
        const innerEdge = sceneDistance(aphelion(inner), cfg) + sceneExtent(inner, cfg);
        const outerEdge = sceneDistance(perihelion(outer), cfg) - sceneExtent(outer, cfg);
        expect(outerEdge, `${inner.id} ↔ ${outer.id}`).toBeGreaterThan(innerEdge);
      }
    },
  );
});

describe('realer Maßstab', () => {
  it('verwendet für Radien und Abstände dieselbe Einheit', () => {
    expect(sceneRadius(AU_KM, REAL)).toBeCloseTo(sceneDistance(1, REAL), 12);
  });

  it('ist linear', () => {
    expect(sceneRadius(6371 * 2, REAL)).toBeCloseTo(2 * sceneRadius(6371, REAL), 15);
    expect(sceneDistance(30, REAL)).toBeCloseTo(30 * sceneDistance(1, REAL), 12);
  });

  it('bildet 1 AU wie der komprimierte Maßstab ab', () => {
    expect(sceneDistance(1, REAL)).toBe(sceneDistance(1, COMPRESSED));
  });
});

describe('blendScale', () => {
  it('liefert an den Endpunkten exakt die beiden Maßstäbe', () => {
    expect(blendScale(COMPRESSED, REAL, 0)).toEqual(COMPRESSED);
    expect(blendScale(COMPRESSED, REAL, 1)).toEqual(REAL);
  });

  it('verändert Radien und Abstände monoton in t (log-linear)', () => {
    const ts = Array.from({ length: 11 }, (_, i) => i / 10);
    const cfgs: ScaleConfig[] = ts.map((t) => blendScale(COMPRESSED, REAL, t));
    for (const radiusKm of [2439.7, 6371, 69911, 695700]) {
      const r = cfgs.map((c) => sceneRadius(radiusKm, c));
      for (let i = 1; i < r.length; i++) expect(r[i]).toBeLessThan(r[i - 1]);
    }
    // Abstände: unter 1 AU schrumpfen sie (√r > r), darüber wachsen sie
    for (const au of [0.39, 5.2, 30.07]) {
      const d = cfgs.map((c) => sceneDistance(au, c));
      for (let i = 1; i < d.length; i++) expect(Math.sign(d[i] - d[i - 1])).toBe(Math.sign(au - 1));
    }
  });

  it('interpoliert im Log-Raum (Mitte = geometrisches Mittel)', () => {
    const mid = sceneRadius(6371, blendScale(COMPRESSED, REAL, 0.5));
    expect(mid).toBeCloseTo(Math.sqrt(sceneRadius(6371, COMPRESSED) * sceneRadius(6371, REAL)), 12);
  });
});

describe('toScene', () => {
  it('tauscht Achsen: ekliptisch Nord (z) → Szene oben (y), y → −z', () => {
    const [x, y, z] = toScene([0, 0, 1]);
    expect([x, y, z].map((v) => v + 0)).toEqual([0, sceneDistance(1), 0]);
    expect(toScene([0, 1, 0])[2]).toBeCloseTo(-sceneDistance(1));
  });

  it('erhält die Richtung und komprimiert nur den Abstand', () => {
    const p: [number, number, number] = [3, -4, 1.2];
    const r = Math.hypot(...p);
    const s = toScene(p);
    expect(Math.hypot(...s)).toBeCloseTo(sceneDistance(r));
    const k = Math.hypot(...s) / r;
    expect(s[0]).toBeCloseTo(p[0] * k);
    expect(s[1]).toBeCloseTo(p[2] * k);
    expect(s[2]).toBeCloseTo(-p[1] * k);
  });

  it('bildet den Ursprung auf den Ursprung ab', () => {
    expect(toScene([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('toSceneDirection', () => {
  it('ist eine echte Drehung (Determinante +1) ohne Kompression', () => {
    const ex = toSceneDirection([1, 0, 0]);
    const ey = toSceneDirection([0, 1, 0]);
    const ez = toSceneDirection([0, 0, 1]);
    const det =
      ex[0] * (ey[1] * ez[2] - ey[2] * ez[1]) - ex[1] * (ey[0] * ez[2] - ey[2] * ez[0]) + ex[2] * (ey[0] * ez[1] - ey[1] * ez[0]);
    expect(det).toBe(1);
    expect(Math.hypot(...toSceneDirection([3, 4, 12]))).toBe(13);
  });

  it('stimmt in der Richtung mit toScene überein', () => {
    const p: [number, number, number] = [0.3, -1.2, 0.05];
    const a = toSceneDirection(p);
    const b = toScene(p);
    const k = Math.hypot(...b) / Math.hypot(...a);
    a.forEach((v, i) => expect(v * k).toBeCloseTo(b[i]));
  });
});

describe('sceneRingRadius', () => {
  it('skaliert im selben Verhältnis wie der Körperradius', () => {
    expect(sceneRingRadius(120_000, 60_000)).toBeCloseTo(2 * sceneRadius(60_000));
  });
});
