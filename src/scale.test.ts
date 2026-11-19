import { describe, expect, it } from 'vitest';
import { bodies } from './data/bodies';
import { COMPRESSED, sceneDistance, sceneRadius } from './scale';

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

  it('lässt im komprimierten Maßstab keine Körper überlappen (inkl. Sonne)', () => {
    const sorted = [...bodies].sort((a, b) => a.semiMajorAxisAu - b.semiMajorAxisAu);
    for (let i = 1; i < sorted.length; i++) {
      const inner = sorted[i - 1];
      const outer = sorted[i];
      const innerEdge = sceneDistance(inner.semiMajorAxisAu) + sceneRadius(inner.radiusKm);
      const outerEdge = sceneDistance(outer.semiMajorAxisAu) - sceneRadius(outer.radiusKm);
      expect(outerEdge, `${inner.id} ↔ ${outer.id}`).toBeGreaterThan(innerEdge);
    }
  });
});
