import { describe, expect, it } from 'vitest';
import { easeInOutCubic, fitDistance, focusDistance, minZoomDistance } from './cameraMath';

describe('easeInOutCubic', () => {
  it('startet bei 0, endet bei 1, ist symmetrisch um 0,5', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1);
  });

  it('ist monoton und klemmt außerhalb [0, 1]', () => {
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.01) {
      const v = easeInOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(easeInOutCubic(-3)).toBe(0);
    expect(easeInOutCubic(7)).toBe(1);
  });
});

describe('fitDistance', () => {
  const DEG = Math.PI / 180;

  it('braucht im Hochformat mehr Abstand als im Querformat', () => {
    expect(fitDistance(45, 50, 0.5)).toBeGreaterThan(fitDistance(45, 50, 16 / 9));
  });

  it.each([0.5, 1, 16 / 9, 3])('Kugel passt bei Seitenverhältnis %s horizontal und vertikal ins Bild', (aspect) => {
    const r = 45;
    const fov = 50;
    const d = fitDistance(r, fov, aspect);
    const angularRadius = Math.asin(r / d);
    const halfV = (fov / 2) * DEG;
    const halfH = Math.atan(Math.tan(halfV) * aspect);
    expect(angularRadius).toBeLessThanOrEqual(halfV);
    expect(angularRadius).toBeLessThanOrEqual(halfH);
    // und nicht unnötig weit weg (Rand ≤ 10 %)
    expect(angularRadius).toBeGreaterThan(Math.min(halfV, halfH) * 0.9);
  });
});

describe('Fokus-Abstände', () => {
  it('Betrachtungsabstand liegt außerhalb der Zoom-Grenze, die außerhalb des Körpers liegt', () => {
    expect(minZoomDistance(1)).toBeGreaterThan(1);
    expect(focusDistance(1)).toBeGreaterThan(minZoomDistance(1));
  });
});
