import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { isOccluded } from './occlusion';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const eye = v(0, 0, 10);

describe('isOccluded', () => {
  it('erkennt eine Kugel zwischen Auge und Punkt', () => {
    expect(isOccluded(eye, v(0, 0, -10), [{ center: v(0, 0, 0), radius: 1 }])).toBe(true);
  });

  it('ignoriert Kugeln hinter dem Punkt, hinter dem Auge und neben dem Strahl', () => {
    const p = v(0, 0, 0);
    expect(isOccluded(eye, p, [{ center: v(0, 0, -5), radius: 1 }])).toBe(false);
    expect(isOccluded(eye, p, [{ center: v(0, 0, 20), radius: 1 }])).toBe(false);
    expect(isOccluded(eye, p, [{ center: v(3, 0, 5), radius: 1 }])).toBe(false);
  });

  it('streifender Strahl knapp außerhalb des Radius verdeckt nicht', () => {
    expect(isOccluded(eye, v(1.01, 0, -10), [{ center: v(1.01 / 2 + 1.0, 0, 0), radius: 0.5 }])).toBe(false);
  });

  it('Auge innerhalb einer Kugel gilt nicht als verdeckt', () => {
    expect(isOccluded(eye, v(0, 0, 0), [{ center: v(0, 0, 10), radius: 2 }])).toBe(false);
  });
});
